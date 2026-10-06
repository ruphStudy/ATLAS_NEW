import {
  BarcodeType,
  BarcodeEntityType,
  BarcodeStatus,
  ScanResult,
  LabelSize,
} from '../interfaces';

export class BarcodeResponseDto {
  id!: string;
  workspaceId!: string;
  value!: string;
  type!: BarcodeType;
  entityType!: BarcodeEntityType;
  entityId!: string;
  status!: BarcodeStatus;
  version!: number;
  replacedById!: string | null;
  gs1Prefix!: string | null;
  metadata!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;

  static from(record: Record<string, unknown>): BarcodeResponseDto {
    const dto = new BarcodeResponseDto();
    dto.id = record['id'] as string;
    dto.workspaceId = record['workspaceId'] as string;
    dto.value = record['value'] as string;
    dto.type = record['type'] as BarcodeType;
    dto.entityType = record['entityType'] as BarcodeEntityType;
    dto.entityId = record['entityId'] as string;
    dto.status = record['status'] as BarcodeStatus;
    dto.version = record['version'] as number;
    dto.replacedById = (record['replacedById'] as string) ?? null;
    dto.gs1Prefix = (record['gs1Prefix'] as string) ?? null;
    dto.metadata = (record['metadata'] as Record<string, unknown>) ?? {};
    dto.createdAt = record['createdAt'] as Date;
    dto.updatedAt = record['updatedAt'] as Date;
    return dto;
  }
}

export class BarcodeListResponseDto {
  items!: BarcodeResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): BarcodeListResponseDto {
    const dto = new BarcodeListResponseDto();
    dto.items = items.map(BarcodeResponseDto.from);
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}

export class ScanResultDto {
  success!: boolean;
  result!: ScanResult;
  barcode!: BarcodeResponseDto | null;
  entityType!: BarcodeEntityType | null;
  entityId!: string | null;
  message!: string;

  static success(
    barcode: Record<string, unknown>,
    message: string = 'Barcode scanned successfully',
  ): ScanResultDto {
    const dto = new ScanResultDto();
    dto.success = true;
    dto.result = ScanResult.SUCCESS;
    dto.barcode = BarcodeResponseDto.from(barcode);
    dto.entityType = barcode['entityType'] as BarcodeEntityType;
    dto.entityId = barcode['entityId'] as string;
    dto.message = message;
    return dto;
  }

  static notFound(scannedValue: string): ScanResultDto {
    const dto = new ScanResultDto();
    dto.success = false;
    dto.result = ScanResult.NOT_FOUND;
    dto.barcode = null;
    dto.entityType = null;
    dto.entityId = null;
    dto.message = `Barcode not found: ${scannedValue}`;
    return dto;
  }

  static inactive(barcode: Record<string, unknown>): ScanResultDto {
    const dto = new ScanResultDto();
    dto.success = false;
    dto.result = ScanResult.INACTIVE;
    dto.barcode = BarcodeResponseDto.from(barcode);
    dto.entityType = barcode['entityType'] as BarcodeEntityType;
    dto.entityId = barcode['entityId'] as string;
    dto.message = 'Barcode is inactive';
    return dto;
  }

  static invalid(message: string): ScanResultDto {
    const dto = new ScanResultDto();
    dto.success = false;
    dto.result = ScanResult.INVALID;
    dto.barcode = null;
    dto.entityType = null;
    dto.entityId = null;
    dto.message = message;
    return dto;
  }
}

export class LabelTemplateResponseDto {
  id!: string;
  workspaceId!: string;
  name!: string;
  description!: string | null;
  entityType!: BarcodeEntityType;
  size!: LabelSize;
  width!: number | null;
  height!: number | null;
  fields!: string[];
  logoUrl!: string | null;
  printerSettings!: Record<string, unknown>;
  isDefault!: boolean;
  metadata!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;

  static from(record: Record<string, unknown>): LabelTemplateResponseDto {
    const dto = new LabelTemplateResponseDto();
    dto.id = record['id'] as string;
    dto.workspaceId = record['workspaceId'] as string;
    dto.name = record['name'] as string;
    dto.description = (record['description'] as string) ?? null;
    dto.entityType = record['entityType'] as BarcodeEntityType;
    dto.size = record['size'] as LabelSize;
    dto.width = (record['width'] as number) ?? null;
    dto.height = (record['height'] as number) ?? null;
    dto.fields = (record['fields'] as string[]) ?? [];
    dto.logoUrl = (record['logoUrl'] as string) ?? null;
    dto.printerSettings = (record['printerSettings'] as Record<string, unknown>) ?? {};
    dto.isDefault = (record['isDefault'] as boolean) ?? false;
    dto.metadata = (record['metadata'] as Record<string, unknown>) ?? {};
    dto.createdAt = record['createdAt'] as Date;
    dto.updatedAt = record['updatedAt'] as Date;
    return dto;
  }
}

export class LabelTemplateListResponseDto {
  items!: LabelTemplateResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): LabelTemplateListResponseDto {
    const dto = new LabelTemplateListResponseDto();
    dto.items = items.map(LabelTemplateResponseDto.from);
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}

export class PrintJobResponseDto {
  barcodeId!: string;
  templateId!: string | null;
  quantity!: number;
  status!: string;
  message!: string;

  static success(
    barcodeId: string,
    templateId: string | null,
    quantity: number,
  ): PrintJobResponseDto {
    const dto = new PrintJobResponseDto();
    dto.barcodeId = barcodeId;
    dto.templateId = templateId;
    dto.quantity = quantity;
    dto.status = 'success';
    dto.message = `Label printed successfully (${quantity} copies)`;
    return dto;
  }
}

export class BulkPrintJobResponseDto {
  successful!: number;
  failed!: number;
  results!: PrintJobResponseDto[];
}
