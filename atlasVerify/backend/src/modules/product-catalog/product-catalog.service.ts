import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ProductCatalogRepository } from './product-catalog.repository';
import { CatalogEventQueue } from './jobs';
import {
  CatalogEvent,
  CatalogStatus,
} from './interfaces';
import {
  ApproveCatalogDto,
  ArchiveCatalogDto,
  CatalogFilterDto,
  CatalogHistoryResponseDto,
  CatalogProductListResponseDto,
  CatalogProductResponseDto,
  CatalogStatsDto,
  CreateCatalogProductDto,
  MarkAiGeneratedDto,
  PublishCatalogDto,
  RequestAiGenerationDto,
  RevertToDraftDto,
  SubmitForApprovalDto,
  UpdateCatalogProductDto,
} from './dto';
import { CATALOG_CONSTANTS } from './constants';

@Injectable()
export class ProductCatalogService {
  private readonly logger = new Logger(ProductCatalogService.name);

  constructor(
    private readonly repository: ProductCatalogRepository,
    private readonly eventQueue: CatalogEventQueue,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────

  private async findOrFail(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) throw new NotFoundException(`Catalog product ${id} not found`);
    return record;
  }

  private assertTransition(current: CatalogStatus, next: CatalogStatus): void {
    const allowed = CATALOG_CONSTANTS.ALLOWED_TRANSITIONS[current];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Cannot transition catalog from ${current} to ${next}`,
      );
    }
  }

  private async recordHistory(
    catalogId: string,
    workspaceId: string,
    fromStatus: CatalogStatus,
    toStatus: CatalogStatus,
    version: number,
    reason: string | null,
    changedBy: string | null,
    snapshot?: Record<string, unknown>,
  ): Promise<void> {
    await this.repository.createHistoryEntry({
      catalogId,
      workspaceId,
      fromStatus,
      toStatus,
      version,
      reason,
      changedBy,
      snapshot: snapshot ?? null,
    });
  }

  private async publishEvent(
    record: Record<string, unknown>,
    event: CatalogEvent,
    triggeredBy?: string,
  ): Promise<void> {
    await this.eventQueue.enqueue({
      catalogId: record['id'] as string,
      catalogSku: record['catalogSku'] as string,
      workspaceId: record['workspaceId'] as string,
      event,
      triggeredBy,
    });
  }

  // ── Create ───────────────────────────────────────────────────

  async create(
    workspaceId: string,
    dto: CreateCatalogProductDto,
    createdBy: string,
  ): Promise<CatalogProductResponseDto> {
    // Duplicate detection
    const potential = await this.repository.findPotentialDuplicate(
      workspaceId,
      dto.productName,
      dto.brand,
      dto.supplierId,
    );

    const sequence = await this.repository.getNextSequence(workspaceId);
    const catalogSku = `${CATALOG_CONSTANTS.SKU_PREFIX}-${String(sequence).padStart(CATALOG_CONSTANTS.SKU_PAD_LENGTH, '0')}`;

    const record = await this.repository.create({
      workspaceId,
      catalogSku,
      skuSequence: sequence,
      version: CATALOG_CONSTANTS.INITIAL_VERSION,
      status: CatalogStatus.DRAFT,
      productName: dto.productName,
      brand: dto.brand ?? null,
      categoryId: dto.categoryId ?? null,
      productType: dto.productType,
      description: dto.description ?? null,
      shortDescription: dto.shortDescription ?? null,
      procurementId: dto.procurementId ?? null,
      qualityInspectionId: dto.qualityInspectionId ?? null,
      supplierId: dto.supplierId ?? null,
      countryOfOrigin: dto.countryOfOrigin ?? null,
      hsCode: dto.hsCode ?? null,
      specifications: dto.specifications ?? [],
      attributes: dto.attributes ?? [],
      variants: dto.variants ?? [],
      images: dto.images ?? [],
      documents: dto.documents ?? [],
      purchaseCost: dto.purchaseCost ?? null,
      landedCost: dto.landedCost ?? null,
      suggestedSellingPrice: dto.suggestedSellingPrice ?? null,
      currency: dto.currency ?? null,
      dimensions: dto.dimensions ?? null,
      weight: dto.weight ?? null,
      packagingDetails: dto.packagingDetails ?? null,
      isDuplicate: !!potential,
      duplicateOfId: potential ? (potential['id'] as string) : null,
    });

    await this.recordHistory(
      record['id'] as string,
      workspaceId,
      CatalogStatus.DRAFT,
      CatalogStatus.DRAFT,
      CATALOG_CONSTANTS.INITIAL_VERSION,
      'Catalog product created',
      createdBy,
    );

    await this.publishEvent(record, CatalogEvent.CREATED, createdBy);
    return CatalogProductResponseDto.from(record);
  }

  // ── Update ───────────────────────────────────────────────────

  async update(
    id: string,
    workspaceId: string,
    dto: UpdateCatalogProductDto,
    updatedBy: string,
  ): Promise<CatalogProductResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const status = record['status'] as CatalogStatus;

    if (
      status === CatalogStatus.PUBLISHED ||
      status === CatalogStatus.ARCHIVED
    ) {
      throw new BadRequestException(`Cannot update catalog product in status ${status}`);
    }

    const newVersion = (record['version'] as number) + 1;

    // Re-check duplicate if productName/brand/supplier changed
    let isDuplicate = record['isDuplicate'] as boolean;
    let duplicateOfId = (record['duplicateOfId'] as string | null) ?? null;

    if (dto.productName || dto.brand !== undefined || dto.supplierId !== undefined) {
      const potential = await this.repository.findPotentialDuplicate(
        workspaceId,
        dto.productName ?? (record['productName'] as string),
        dto.brand ?? (record['brand'] as string | null),
        dto.supplierId ?? (record['supplierId'] as string | null),
        id,
      );
      isDuplicate = !!potential;
      duplicateOfId = potential ? (potential['id'] as string) : null;
    }

    const updated = await this.repository.update(id, workspaceId, {
      version: newVersion,
      ...(dto.productName !== undefined && { productName: dto.productName }),
      ...(dto.brand !== undefined && { brand: dto.brand }),
      ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
      ...(dto.productType !== undefined && { productType: dto.productType }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.shortDescription !== undefined && { shortDescription: dto.shortDescription }),
      ...(dto.supplierId !== undefined && { supplierId: dto.supplierId }),
      ...(dto.countryOfOrigin !== undefined && { countryOfOrigin: dto.countryOfOrigin }),
      ...(dto.hsCode !== undefined && { hsCode: dto.hsCode }),
      ...(dto.specifications !== undefined && { specifications: dto.specifications }),
      ...(dto.attributes !== undefined && { attributes: dto.attributes }),
      ...(dto.variants !== undefined && { variants: dto.variants }),
      ...(dto.images !== undefined && { images: dto.images }),
      ...(dto.documents !== undefined && { documents: dto.documents }),
      ...(dto.purchaseCost !== undefined && { purchaseCost: dto.purchaseCost }),
      ...(dto.landedCost !== undefined && { landedCost: dto.landedCost }),
      ...(dto.suggestedSellingPrice !== undefined && { suggestedSellingPrice: dto.suggestedSellingPrice }),
      ...(dto.currency !== undefined && { currency: dto.currency }),
      ...(dto.dimensions !== undefined && { dimensions: dto.dimensions }),
      ...(dto.weight !== undefined && { weight: dto.weight }),
      ...(dto.packagingDetails !== undefined && { packagingDetails: dto.packagingDetails }),
      isDuplicate,
      duplicateOfId,
    });

    await this.recordHistory(
      id,
      workspaceId,
      status,
      status,
      newVersion,
      'Product updated',
      updatedBy,
    );

    await this.publishEvent(updated, CatalogEvent.UPDATED, updatedBy);
    return CatalogProductResponseDto.from(updated);
  }

  // ── Read ─────────────────────────────────────────────────────

  async findAll(workspaceId: string, filter: CatalogFilterDto): Promise<CatalogProductListResponseDto> {
    const [items, total] = await this.repository.findAll(workspaceId, filter);
    return CatalogProductListResponseDto.from(items, total, filter.page, filter.limit);
  }

  async findById(id: string, workspaceId: string): Promise<CatalogProductResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    return CatalogProductResponseDto.from(record);
  }

  async getStats(workspaceId: string): Promise<CatalogStatsDto> {
    const raw = await this.repository.getStats(workspaceId);
    const dto = new CatalogStatsDto();
    dto.total = raw['total'] as number;
    dto.byStatus = raw['byStatus'] as Record<string, number>;
    dto.byProductType = raw['byProductType'] as Record<string, number>;
    dto.duplicates = raw['duplicates'] as number;
    return dto;
  }

  async getHistory(id: string, workspaceId: string): Promise<CatalogHistoryResponseDto[]> {
    await this.findOrFail(id, workspaceId);
    const history = await this.repository.findHistory(id, workspaceId);
    return history.map(CatalogHistoryResponseDto.from);
  }

  // ── Actions ──────────────────────────────────────────────────

  async requestAiGeneration(
    id: string,
    workspaceId: string,
    dto: RequestAiGenerationDto,
    userId: string,
  ): Promise<CatalogProductResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as CatalogStatus;
    this.assertTransition(current, CatalogStatus.READY_FOR_AI);

    const updated = await this.repository.update(id, workspaceId, {
      status: CatalogStatus.READY_FOR_AI,
    });

    await this.recordHistory(
      id, workspaceId, current, CatalogStatus.READY_FOR_AI,
      record['version'] as number, dto.notes ?? 'Sent to AI generation', userId,
    );

    return CatalogProductResponseDto.from(updated);
  }

  async markAiGenerated(
    id: string,
    workspaceId: string,
    dto: MarkAiGeneratedDto,
    userId: string,
  ): Promise<CatalogProductResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as CatalogStatus;
    this.assertTransition(current, CatalogStatus.AI_GENERATED);

    const updated = await this.repository.update(id, workspaceId, {
      status: CatalogStatus.AI_GENERATED,
    });

    await this.recordHistory(
      id, workspaceId, current, CatalogStatus.AI_GENERATED,
      record['version'] as number, dto.notes ?? 'AI content generated', userId,
    );

    return CatalogProductResponseDto.from(updated);
  }

  async submitForApproval(
    id: string,
    workspaceId: string,
    dto: SubmitForApprovalDto,
    userId: string,
  ): Promise<CatalogProductResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as CatalogStatus;
    this.assertTransition(current, CatalogStatus.READY_FOR_APPROVAL);

    const updated = await this.repository.update(id, workspaceId, {
      status: CatalogStatus.READY_FOR_APPROVAL,
    });

    await this.recordHistory(
      id, workspaceId, current, CatalogStatus.READY_FOR_APPROVAL,
      record['version'] as number, dto.notes ?? 'Submitted for approval', userId,
    );

    return CatalogProductResponseDto.from(updated);
  }

  async approve(
    id: string,
    workspaceId: string,
    dto: ApproveCatalogDto,
    userId: string,
  ): Promise<CatalogProductResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as CatalogStatus;
    this.assertTransition(current, CatalogStatus.APPROVED);

    const updated = await this.repository.update(id, workspaceId, {
      status: CatalogStatus.APPROVED,
    });

    await this.recordHistory(
      id, workspaceId, current, CatalogStatus.APPROVED,
      record['version'] as number, dto.notes ?? 'Product approved', userId,
    );

    await this.publishEvent(updated, CatalogEvent.APPROVED, userId);
    return CatalogProductResponseDto.from(updated);
  }

  async publish(
    id: string,
    workspaceId: string,
    dto: PublishCatalogDto,
    userId: string,
  ): Promise<CatalogProductResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as CatalogStatus;
    this.assertTransition(current, CatalogStatus.PUBLISHED);

    const updated = await this.repository.update(id, workspaceId, {
      status: CatalogStatus.PUBLISHED,
    });

    await this.recordHistory(
      id, workspaceId, current, CatalogStatus.PUBLISHED,
      record['version'] as number, dto.notes ?? 'Product published', userId,
    );

    return CatalogProductResponseDto.from(updated);
  }

  async archive(
    id: string,
    workspaceId: string,
    dto: ArchiveCatalogDto,
    userId: string,
  ): Promise<CatalogProductResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as CatalogStatus;
    this.assertTransition(current, CatalogStatus.ARCHIVED);

    const updated = await this.repository.update(id, workspaceId, {
      status: CatalogStatus.ARCHIVED,
    });

    await this.recordHistory(
      id, workspaceId, current, CatalogStatus.ARCHIVED,
      record['version'] as number, dto.reason, userId,
    );

    await this.publishEvent(updated, CatalogEvent.ARCHIVED, userId);
    return CatalogProductResponseDto.from(updated);
  }

  async revertToDraft(
    id: string,
    workspaceId: string,
    dto: RevertToDraftDto,
    userId: string,
  ): Promise<CatalogProductResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as CatalogStatus;
    this.assertTransition(current, CatalogStatus.DRAFT);

    const updated = await this.repository.update(id, workspaceId, {
      status: CatalogStatus.DRAFT,
    });

    await this.recordHistory(
      id, workspaceId, current, CatalogStatus.DRAFT,
      record['version'] as number, dto.reason ?? 'Reverted to draft', userId,
    );

    return CatalogProductResponseDto.from(updated);
  }

  // ── Delete ───────────────────────────────────────────────────

  async remove(id: string, workspaceId: string): Promise<void> {
    const record = await this.findOrFail(id, workspaceId);
    const status = record['status'] as CatalogStatus;
    if (status === CatalogStatus.PUBLISHED) {
      throw new BadRequestException('Cannot delete a published catalog product');
    }
    await this.repository.softDelete(id);
  }
}
