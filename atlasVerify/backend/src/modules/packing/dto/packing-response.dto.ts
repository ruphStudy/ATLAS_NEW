import { PackingStatus, PackingType, PackageType, PackingExceptionType } from '../interfaces';

export class PackingLineResponseDto {
  id!: string;
  taskId!: string;
  lineNumber!: number;
  status!: PackingStatus;
  pickingLineId!: string | null;
  inventoryItemId!: string | null;
  sku!: string | null;
  productName!: string | null;
  variantId!: string | null;
  batchNumber!: string | null;
  serialNumber!: string | null;
  pickedQuantity!: number;
  packedQuantity!: number;
  uom!: string;
  packageId!: string | null;
  transactionId!: string | null;
  scannedBarcodes!: unknown[];
  metadata!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;

  static from(record: Record<string, unknown>): PackingLineResponseDto {
    const dto = new PackingLineResponseDto();
    dto.id = record['id'] as string;
    dto.taskId = record['taskId'] as string;
    dto.lineNumber = record['lineNumber'] as number;
    dto.status = record['status'] as PackingStatus;
    dto.pickingLineId = (record['pickingLineId'] as string) ?? null;
    dto.inventoryItemId = (record['inventoryItemId'] as string) ?? null;
    dto.sku = (record['sku'] as string) ?? null;
    dto.productName = (record['productName'] as string) ?? null;
    dto.variantId = (record['variantId'] as string) ?? null;
    dto.batchNumber = (record['batchNumber'] as string) ?? null;
    dto.serialNumber = (record['serialNumber'] as string) ?? null;
    dto.pickedQuantity = record['pickedQuantity'] as number;
    dto.packedQuantity = record['packedQuantity'] as number;
    dto.uom = record['uom'] as string;
    dto.packageId = (record['packageId'] as string) ?? null;
    dto.transactionId = (record['transactionId'] as string) ?? null;
    dto.scannedBarcodes = (record['scannedBarcodes'] as unknown[]) ?? [];
    dto.metadata = (record['metadata'] as Record<string, unknown>) ?? {};
    dto.createdAt = record['createdAt'] as Date;
    dto.updatedAt = record['updatedAt'] as Date;
    return dto;
  }
}

export class PackingPackageResponseDto {
  id!: string;
  taskId!: string;
  packageNumber!: string;
  packageId!: string;
  packageType!: PackageType;
  length!: number | null;
  width!: number | null;
  height!: number | null;
  dimensionUnit!: string;
  weight!: number | null;
  weightUnit!: string;
  maxWeight!: number | null;
  contents!: unknown[];
  packingMaterial!: unknown[];
  labelUrl!: string | null;
  packingSlipUrl!: string | null;
  evidenceUrls!: string[];
  shipmentReady!: boolean;
  metadata!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;

  static from(record: Record<string, unknown>): PackingPackageResponseDto {
    const dto = new PackingPackageResponseDto();
    dto.id = record['id'] as string;
    dto.taskId = record['taskId'] as string;
    dto.packageNumber = record['packageNumber'] as string;
    dto.packageId = record['packageId'] as string;
    dto.packageType = record['packageType'] as PackageType;
    dto.length = (record['length'] as number) ?? null;
    dto.width = (record['width'] as number) ?? null;
    dto.height = (record['height'] as number) ?? null;
    dto.dimensionUnit = record['dimensionUnit'] as string;
    dto.weight = (record['weight'] as number) ?? null;
    dto.weightUnit = record['weightUnit'] as string;
    dto.maxWeight = (record['maxWeight'] as number) ?? null;
    dto.contents = (record['contents'] as unknown[]) ?? [];
    dto.packingMaterial = (record['packingMaterial'] as unknown[]) ?? [];
    dto.labelUrl = (record['labelUrl'] as string) ?? null;
    dto.packingSlipUrl = (record['packingSlipUrl'] as string) ?? null;
    dto.evidenceUrls = (record['evidenceUrls'] as string[]) ?? [];
    dto.shipmentReady = record['shipmentReady'] as boolean;
    dto.metadata = (record['metadata'] as Record<string, unknown>) ?? {};
    dto.createdAt = record['createdAt'] as Date;
    dto.updatedAt = record['updatedAt'] as Date;
    return dto;
  }
}

export class PackingExceptionResponseDto {
  id!: string;
  taskId!: string;
  lineId!: string | null;
  packageId!: string | null;
  exceptionType!: PackingExceptionType;
  description!: string;
  quantity!: number | null;
  evidenceUrls!: string[];
  resolution!: string | null;
  resolvedBy!: string | null;
  resolvedAt!: Date | null;
  metadata!: Record<string, unknown>;
  createdAt!: Date;

  static from(record: Record<string, unknown>): PackingExceptionResponseDto {
    const dto = new PackingExceptionResponseDto();
    dto.id = record['id'] as string;
    dto.taskId = record['taskId'] as string;
    dto.lineId = (record['lineId'] as string) ?? null;
    dto.packageId = (record['packageId'] as string) ?? null;
    dto.exceptionType = record['exceptionType'] as PackingExceptionType;
    dto.description = record['description'] as string;
    dto.quantity = (record['quantity'] as number) ?? null;
    dto.evidenceUrls = (record['evidenceUrls'] as string[]) ?? [];
    dto.resolution = (record['resolution'] as string) ?? null;
    dto.resolvedBy = (record['resolvedBy'] as string) ?? null;
    dto.resolvedAt = (record['resolvedAt'] as Date) ?? null;
    dto.metadata = (record['metadata'] as Record<string, unknown>) ?? {};
    dto.createdAt = record['createdAt'] as Date;
    return dto;
  }
}

export class PackingResponseDto {
  id!: string;
  workspaceId!: string;
  taskNumber!: string;
  taskSequence!: number;
  status!: PackingStatus;
  packingType!: PackingType;
  warehouseId!: string;
  pickingTaskId!: string | null;
  orderId!: string | null;
  shipmentId!: string | null;
  sourceType!: string;
  sourceId!: string | null;
  assignedTo!: string | null;
  assignedAt!: Date | null;
  startedAt!: Date | null;
  pausedAt!: Date | null;
  completedAt!: Date | null;
  totalQuantity!: number;
  packedQuantity!: number;
  dispatchLocationId!: string | null;
  priority!: number;
  notes!: string | null;
  metadata!: Record<string, unknown>;
  cancelReason!: string | null;
  cancelledBy!: string | null;
  cancelledAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt!: Date | null;
  lines?: PackingLineResponseDto[];
  packages?: PackingPackageResponseDto[];
  exceptions?: PackingExceptionResponseDto[];

  static from(record: Record<string, unknown>, includeLines = false, includePackages = false, includeExceptions = false): PackingResponseDto {
    const dto = new PackingResponseDto();
    dto.id = record['id'] as string;
    dto.workspaceId = record['workspaceId'] as string;
    dto.taskNumber = record['taskNumber'] as string;
    dto.taskSequence = record['taskSequence'] as number;
    dto.status = record['status'] as PackingStatus;
    dto.packingType = record['packingType'] as PackingType;
    dto.warehouseId = record['warehouseId'] as string;
    dto.pickingTaskId = (record['pickingTaskId'] as string) ?? null;
    dto.orderId = (record['orderId'] as string) ?? null;
    dto.shipmentId = (record['shipmentId'] as string) ?? null;
    dto.sourceType = record['sourceType'] as string;
    dto.sourceId = (record['sourceId'] as string) ?? null;
    dto.assignedTo = (record['assignedTo'] as string) ?? null;
    dto.assignedAt = (record['assignedAt'] as Date) ?? null;
    dto.startedAt = (record['startedAt'] as Date) ?? null;
    dto.pausedAt = (record['pausedAt'] as Date) ?? null;
    dto.completedAt = (record['completedAt'] as Date) ?? null;
    dto.totalQuantity = record['totalQuantity'] as number;
    dto.packedQuantity = record['packedQuantity'] as number;
    dto.dispatchLocationId = (record['dispatchLocationId'] as string) ?? null;
    dto.priority = record['priority'] as number;
    dto.notes = (record['notes'] as string) ?? null;
    dto.metadata = (record['metadata'] as Record<string, unknown>) ?? {};
    dto.cancelReason = (record['cancelReason'] as string) ?? null;
    dto.cancelledBy = (record['cancelledBy'] as string) ?? null;
    dto.cancelledAt = (record['cancelledAt'] as Date) ?? null;
    dto.createdAt = record['createdAt'] as Date;
    dto.updatedAt = record['updatedAt'] as Date;
    dto.deletedAt = (record['deletedAt'] as Date) ?? null;
    if (includeLines && record['lines']) {
      dto.lines = (record['lines'] as Record<string, unknown>[]).map(PackingLineResponseDto.from);
    }
    if (includePackages && record['packages']) {
      dto.packages = (record['packages'] as Record<string, unknown>[]).map(PackingPackageResponseDto.from);
    }
    if (includeExceptions && record['exceptions']) {
      dto.exceptions = (record['exceptions'] as Record<string, unknown>[]).map(PackingExceptionResponseDto.from);
    }
    return dto;
  }
}

export class PackingListResponseDto {
  items!: PackingResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): PackingListResponseDto {
    const dto = new PackingListResponseDto();
    dto.items = items.map((item) => PackingResponseDto.from(item));
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}
