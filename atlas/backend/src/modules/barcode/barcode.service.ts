import { Injectable } from '@nestjs/common';
import {
  BusinessRuleException,
  DuplicateResourceException,
  ResourceNotFoundException,
} from '@common/exceptions/atlas.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';
import { BarcodeRepository } from './barcode.repository';
import { BarcodeEventQueue } from './jobs';
import {
  GenerateBarcodeDto,
  BulkGenerateBarcodeDto,
  AssignBarcodeDto,
  ScanBarcodeDto,
  PrintLabelDto,
  BulkPrintLabelDto,
  ReplaceBarcodeDto,
  CreateLabelTemplateDto,
  UpdateLabelTemplateDto,
  BarcodeFilterDto,
  LabelTemplateFilterDto,
  BarcodeResponseDto,
  BarcodeListResponseDto,
  ScanResultDto,
  LabelTemplateResponseDto,
  LabelTemplateListResponseDto,
  PrintJobResponseDto,
  BulkPrintJobResponseDto,
} from './dto';
import {
  BarcodeType,
  BarcodeEntityType,
  BarcodeStatus,
  BarcodeEvent,
  ScanResult,
  LabelSize,
} from './interfaces';

@Injectable()
export class BarcodeService {
  constructor(
    private readonly repository: BarcodeRepository,
    private readonly eventQueue: BarcodeEventQueue,
  ) {}

  // ── Generate & Assign ────────────────────────────────────────

  async generate(
    workspaceId: string,
    dto: GenerateBarcodeDto,
  ): Promise<BarcodeResponseDto> {
    // Check if entity already has an active barcode
    const existing = await this.repository.findActiveByEntity(
      dto.entityType,
      dto.entityId,
      workspaceId,
    );

    if (existing) {
      throw new DuplicateResourceException(
        'Barcode',
        'entity',
        `${dto.entityType}:${dto.entityId}`,
      );
    }

    // Generate or use custom value
    const value = dto.customValue ?? this.generateBarcodeValue(dto.type ?? BarcodeType.CODE_128);

    // Check for duplicate value
    const duplicateValue = await this.repository.findByValue(value, workspaceId);
    if (duplicateValue) {
      throw new DuplicateResourceException('Barcode', 'value', value);
    }

    // Validate GS1 prefix if provided
    if (dto.gs1Prefix) {
      this.validateGS1Prefix(value, dto.gs1Prefix);
    }

    const barcode = await this.repository.create({
      workspaceId,
      value,
      type: dto.type ?? BarcodeType.CODE_128,
      entityType: dto.entityType,
      entityId: dto.entityId,
      status: BarcodeStatus.ACTIVE,
      version: 1,
      gs1Prefix: dto.gs1Prefix ?? null,
      metadata: dto.metadata ?? {},
    });

    await this.eventQueue.enqueue({
      workspaceId,
      barcodeId: barcode['id'] as string,
      event: BarcodeEvent.GENERATED,
      metadata: {
        entityType: dto.entityType,
        entityId: dto.entityId,
      },
    });

    return BarcodeResponseDto.from(barcode);
  }

  async bulkGenerate(
    workspaceId: string,
    dto: BulkGenerateBarcodeDto,
  ): Promise<BarcodeResponseDto[]> {
    const results: BarcodeResponseDto[] = [];

    for (const entityId of dto.entityIds) {
      try {
        const barcode = await this.generate(workspaceId, {
          entityType: dto.entityType,
          entityId,
          type: dto.type,
          gs1Prefix: dto.gs1Prefix,
        });
        results.push(barcode);
      } catch (error) {
        // Log error but continue with other entities
        console.error(`Failed to generate barcode for ${entityId}:`, error);
      }
    }

    return results;
  }

  async assign(workspaceId: string, dto: AssignBarcodeDto): Promise<BarcodeResponseDto> {
    // Check if entity already has an active barcode
    const existing = await this.repository.findActiveByEntity(
      dto.entityType,
      dto.entityId,
      workspaceId,
    );

    if (existing) {
      throw new DuplicateResourceException(
        'Barcode',
        'entity',
        `${dto.entityType}:${dto.entityId}`,
      );
    }

    // Check if value is already used
    const duplicateValue = await this.repository.findByValue(dto.value, workspaceId);
    if (duplicateValue) {
      throw new DuplicateResourceException('Barcode', 'value', dto.value);
    }

    const barcode = await this.repository.create({
      workspaceId,
      value: dto.value,
      type: dto.type ?? BarcodeType.CODE_128,
      entityType: dto.entityType,
      entityId: dto.entityId,
      status: BarcodeStatus.ACTIVE,
      version: 1,
      metadata: {},
    });

    await this.eventQueue.enqueue({
      workspaceId,
      barcodeId: barcode['id'] as string,
      event: BarcodeEvent.ASSIGNED,
      metadata: {
        entityType: dto.entityType,
        entityId: dto.entityId,
      },
    });

    return BarcodeResponseDto.from(barcode);
  }

  // ── Scan ─────────────────────────────────────────────────────

  async scan(workspaceId: string, dto: ScanBarcodeDto): Promise<ScanResultDto> {
    const barcode = await this.repository.findByValue(dto.value, workspaceId);

    let result: ScanResultDto;

    if (!barcode) {
      result = ScanResultDto.notFound(dto.value);
      await this.repository.createScanHistory({
        workspaceId,
        barcodeId: null,
        scannedValue: dto.value,
        result: ScanResult.NOT_FOUND,
        scannedBy: dto.scannedBy ?? null,
        deviceId: dto.deviceId ?? null,
        locationContext: dto.locationContext ?? null,
        metadata: dto.metadata ?? null,
      });
    } else if (barcode['status'] !== BarcodeStatus.ACTIVE) {
      result = ScanResultDto.inactive(barcode);
      await this.repository.createScanHistory({
        workspaceId,
        barcodeId: barcode['id'] as string,
        scannedValue: dto.value,
        result: ScanResult.INACTIVE,
        entityType: barcode['entityType'] as BarcodeEntityType,
        entityId: barcode['entityId'] as string,
        scannedBy: dto.scannedBy ?? null,
        deviceId: dto.deviceId ?? null,
        locationContext: dto.locationContext ?? null,
        metadata: dto.metadata ?? null,
      });
    } else {
      result = ScanResultDto.success(barcode);
      await this.repository.createScanHistory({
        workspaceId,
        barcodeId: barcode['id'] as string,
        scannedValue: dto.value,
        result: ScanResult.SUCCESS,
        entityType: barcode['entityType'] as BarcodeEntityType,
        entityId: barcode['entityId'] as string,
        scannedBy: dto.scannedBy ?? null,
        deviceId: dto.deviceId ?? null,
        locationContext: dto.locationContext ?? null,
        metadata: dto.metadata ?? null,
      });

      await this.eventQueue.enqueue({
        workspaceId,
        barcodeId: barcode['id'] as string,
        event: BarcodeEvent.SCANNED,
        metadata: {
          scannedBy: dto.scannedBy,
          deviceId: dto.deviceId,
          locationContext: dto.locationContext,
        },
      });
    }

    return result;
  }

  // ── Print ────────────────────────────────────────────────────

  async print(
    workspaceId: string,
    dto: PrintLabelDto,
  ): Promise<PrintJobResponseDto> {
    const barcode = await this.repository.findById(dto.barcodeId, workspaceId);
    if (!barcode) {
      throw new ResourceNotFoundException('Barcode', dto.barcodeId);
    }

    let template: Record<string, unknown> | null = null;
    if (dto.templateId) {
      template = await this.repository.findTemplateById(dto.templateId, workspaceId);
      if (!template) {
        throw new ResourceNotFoundException('Label template', dto.templateId);
      }
    } else {
      // Use default template for entity type
      template = await this.repository.findDefaultTemplate(
        barcode['entityType'] as BarcodeEntityType,
        workspaceId,
      );
    }

    await this.repository.createPrintHistory({
      workspaceId,
      barcodeId: dto.barcodeId,
      templateId: template?.['id'] ?? null,
      labelSize: dto.labelSize ?? LabelSize.MEDIUM,
      quantity: dto.quantity ?? 1,
      printedBy: dto.printedBy ?? null,
      printerName: dto.printerName ?? null,
      metadata: {},
    });

    await this.eventQueue.enqueue({
      workspaceId,
      barcodeId: dto.barcodeId,
      event: BarcodeEvent.LABEL_PRINTED,
      metadata: {
        templateId: template?.['id'],
        quantity: dto.quantity ?? 1,
        printedBy: dto.printedBy,
      },
    });

    return PrintJobResponseDto.success(
      dto.barcodeId,
      (template?.['id'] as string) ?? null,
      dto.quantity ?? 1,
    );
  }

  async bulkPrint(
    workspaceId: string,
    dto: BulkPrintLabelDto,
  ): Promise<BulkPrintJobResponseDto> {
    const results: PrintJobResponseDto[] = [];
    let successful = 0;
    let failed = 0;

    for (const barcodeId of dto.barcodeIds) {
      try {
        const result = await this.print(workspaceId, {
          barcodeId,
          templateId: dto.templateId,
          labelSize: dto.labelSize,
          quantity: dto.quantityPerLabel,
          printedBy: dto.printedBy,
          printerName: dto.printerName,
        });
        results.push(result);
        successful++;
      } catch (error) {
        failed++;
        console.error(`Failed to print label for barcode ${barcodeId}:`, error);
      }
    }

    return { successful, failed, results };
  }

  // ── Replace & Deactivate ─────────────────────────────────────

  async replace(
    id: string,
    workspaceId: string,
    dto: ReplaceBarcodeDto,
  ): Promise<BarcodeResponseDto> {
    const oldBarcode = await this.repository.findById(id, workspaceId);
    if (!oldBarcode) {
      throw new ResourceNotFoundException('Barcode', id);
    }

    // Mark old barcode as replaced
    await this.repository.update(id, {
      status: BarcodeStatus.REPLACED,
    });

    // Generate new barcode value if not provided
    const newValue =
      dto.newValue ??
      this.generateBarcodeValue(
        dto.newType ?? (oldBarcode['type'] as BarcodeType),
      );

    // Check for duplicate value
    const duplicateValue = await this.repository.findByValue(newValue, workspaceId);
    if (duplicateValue) {
      throw new DuplicateResourceException('Barcode', 'value', newValue);
    }

    // Create new barcode
    const newBarcode = await this.repository.create({
      workspaceId,
      value: newValue,
      type: dto.newType ?? oldBarcode['type'],
      entityType: oldBarcode['entityType'],
      entityId: oldBarcode['entityId'],
      status: BarcodeStatus.ACTIVE,
      version: ((oldBarcode['version'] as number) ?? 1) + 1,
      replacedById: id,
      gs1Prefix: oldBarcode['gs1Prefix'],
      metadata: { ...oldBarcode['metadata'], replacementReason: dto.reason },
    });

    await this.eventQueue.enqueue({
      workspaceId,
      barcodeId: newBarcode['id'] as string,
      event: BarcodeEvent.REPLACED,
      metadata: {
        oldBarcodeId: id,
        oldValue: oldBarcode['value'],
        reason: dto.reason,
      },
    });

    return BarcodeResponseDto.from(newBarcode);
  }

  async deactivate(id: string, workspaceId: string): Promise<BarcodeResponseDto> {
    const barcode = await this.repository.findById(id, workspaceId);
    if (!barcode) {
      throw new ResourceNotFoundException('Barcode', id);
    }

    const updated = await this.repository.update(id, {
      status: BarcodeStatus.DEACTIVATED,
    });

    await this.eventQueue.enqueue({
      workspaceId,
      barcodeId: id,
      event: BarcodeEvent.DEACTIVATED,
    });

    return BarcodeResponseDto.from(updated);
  }

  // ── Query ────────────────────────────────────────────────────

  async findAll(
    workspaceId: string,
    filter: BarcodeFilterDto,
  ): Promise<BarcodeListResponseDto> {
    const [items, total] = await this.repository.findAll(workspaceId, filter);
    return BarcodeListResponseDto.from(items, total, filter.page, filter.limit);
  }

  async findById(id: string, workspaceId: string): Promise<BarcodeResponseDto> {
    const barcode = await this.repository.findById(id, workspaceId);
    if (!barcode) {
      throw new ResourceNotFoundException('Barcode', id);
    }
    return BarcodeResponseDto.from(barcode);
  }

  // ── Templates ────────────────────────────────────────────────

  async createTemplate(
    workspaceId: string,
    dto: CreateLabelTemplateDto,
  ): Promise<LabelTemplateResponseDto> {
    const template = await this.repository.createTemplate({
      workspaceId,
      name: dto.name,
      description: dto.description ?? null,
      entityType: dto.entityType,
      size: dto.size ?? LabelSize.MEDIUM,
      width: dto.width ?? null,
      height: dto.height ?? null,
      fields: dto.fields,
      logoUrl: dto.logoUrl ?? null,
      printerSettings: dto.printerSettings ?? {},
      isDefault: dto.isDefault ?? false,
      metadata: dto.metadata ?? {},
    });

    return LabelTemplateResponseDto.from(template);
  }

  async updateTemplate(
    id: string,
    workspaceId: string,
    dto: UpdateLabelTemplateDto,
  ): Promise<LabelTemplateResponseDto> {
    const existing = await this.repository.findTemplateById(id, workspaceId);
    if (!existing) {
      throw new ResourceNotFoundException('Label template', id);
    }

    const updated = await this.repository.updateTemplate(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.size !== undefined && { size: dto.size }),
      ...(dto.width !== undefined && { width: dto.width }),
      ...(dto.height !== undefined && { height: dto.height }),
      ...(dto.fields !== undefined && { fields: dto.fields }),
      ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
      ...(dto.printerSettings !== undefined && { printerSettings: dto.printerSettings }),
      ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      ...(dto.metadata !== undefined && { metadata: dto.metadata }),
    });

    return LabelTemplateResponseDto.from(updated);
  }

  async findAllTemplates(
    workspaceId: string,
    filter: LabelTemplateFilterDto,
  ): Promise<LabelTemplateListResponseDto> {
    const [items, total] = await this.repository.findAllTemplates(workspaceId, filter);
    return LabelTemplateListResponseDto.from(items, total, filter.page, filter.limit);
  }

  async findTemplateById(
    id: string,
    workspaceId: string,
  ): Promise<LabelTemplateResponseDto> {
    const template = await this.repository.findTemplateById(id, workspaceId);
    if (!template) {
      throw new ResourceNotFoundException('Label template', id);
    }
    return LabelTemplateResponseDto.from(template);
  }

  async deleteTemplate(id: string, workspaceId: string): Promise<void> {
    const existing = await this.repository.findTemplateById(id, workspaceId);
    if (!existing) {
      throw new ResourceNotFoundException('Label template', id);
    }
    await this.repository.deleteTemplate(id);
  }

  // ── Helper Methods ───────────────────────────────────────────

  private generateBarcodeValue(type: BarcodeType): string {
    switch (type) {
      case BarcodeType.UPC:
        return this.generateUPC();
      case BarcodeType.EAN:
        return this.generateEAN();
      case BarcodeType.GTIN:
        return this.generateGTIN();
      case BarcodeType.CODE_128:
      case BarcodeType.CODE_39:
      case BarcodeType.QR:
      case BarcodeType.CUSTOM:
      default:
        return this.generateRandomCode();
    }
  }

  private generateUPC(): string {
    // Generate 12-digit UPC (simplified)
    const digits = Array.from({ length: 11 }, () => Math.floor(Math.random() * 10));
    const checkDigit = this.calculateUPCCheckDigit(digits);
    return [...digits, checkDigit].join('');
  }

  private generateEAN(): string {
    // Generate 13-digit EAN (simplified)
    const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));
    const checkDigit = this.calculateEANCheckDigit(digits);
    return [...digits, checkDigit].join('');
  }

  private generateGTIN(): string {
    // Generate 14-digit GTIN (simplified)
    const digits = Array.from({ length: 13 }, () => Math.floor(Math.random() * 10));
    const checkDigit = this.calculateGTINCheckDigit(digits);
    return [...digits, checkDigit].join('');
  }

  private generateRandomCode(): string {
    return `BC${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  private calculateUPCCheckDigit(digits: number[]): number {
    const sum = digits.reduce((acc, digit, index) => {
      return acc + digit * (index % 2 === 0 ? 3 : 1);
    }, 0);
    return (10 - (sum % 10)) % 10;
  }

  private calculateEANCheckDigit(digits: number[]): number {
    const sum = digits.reduce((acc, digit, index) => {
      return acc + digit * (index % 2 === 0 ? 1 : 3);
    }, 0);
    return (10 - (sum % 10)) % 10;
  }

  private calculateGTINCheckDigit(digits: number[]): number {
    const sum = digits.reduce((acc, digit, index) => {
      return acc + digit * (index % 2 === 0 ? 3 : 1);
    }, 0);
    return (10 - (sum % 10)) % 10;
  }

  private validateGS1Prefix(value: string, prefix: string): void {
    if (!value.startsWith(prefix)) {
      throw new BusinessRuleException(
        `Barcode value must start with GS1 prefix ${prefix}`,
        ErrorCode.BARCODE_INVALID_GS1_PREFIX,
      );
    }
  }
}
