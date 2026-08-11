import { PickingStatus, PickingType, PickingStrategy, ExceptionType } from '../interfaces';

export class PickingLineResponseDto {
  id!: string;
  taskId!: string;
  lineNumber!: number;
  status!: PickingStatus;
  inventoryItemId!: string | null;
  allocationId!: string | null;
  reservationId!: string | null;
  sku!: string | null;
  productName!: string | null;
  variantId!: string | null;
  batchNumber!: string | null;
  serialNumber!: string | null;
  expiryDate!: Date | null;
  sourceZoneId!: string | null;
  sourceLocationId!: string | null;
  sourceBinId!: string | null;
  requestedQuantity!: number;
  pickedQuantity!: number;
  shortQuantity!: number;
  uom!: string;
  transactionId!: string | null;
  stagingLocationId!: string | null;
  scannedBarcodes!: unknown[];
  metadata!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;

  static from(record: Record<string, unknown>): PickingLineResponseDto {
    const dto = new PickingLineResponseDto();
    dto.id = record['id'] as string;
    dto.taskId = record['taskId'] as string;
    dto.lineNumber = record['lineNumber'] as number;
    dto.status = record['status'] as PickingStatus;
    dto.inventoryItemId = (record['inventoryItemId'] as string) ?? null;
    dto.allocationId = (record['allocationId'] as string) ?? null;
    dto.reservationId = (record['reservationId'] as string) ?? null;
    dto.sku = (record['sku'] as string) ?? null;
    dto.productName = (record['productName'] as string) ?? null;
    dto.variantId = (record['variantId'] as string) ?? null;
    dto.batchNumber = (record['batchNumber'] as string) ?? null;
    dto.serialNumber = (record['serialNumber'] as string) ?? null;
    dto.expiryDate = (record['expiryDate'] as Date) ?? null;
    dto.sourceZoneId = (record['sourceZoneId'] as string) ?? null;
    dto.sourceLocationId = (record['sourceLocationId'] as string) ?? null;
    dto.sourceBinId = (record['sourceBinId'] as string) ?? null;
    dto.requestedQuantity = record['requestedQuantity'] as number;
    dto.pickedQuantity = record['pickedQuantity'] as number;
    dto.shortQuantity = record['shortQuantity'] as number;
    dto.uom = record['uom'] as string;
    dto.transactionId = (record['transactionId'] as string) ?? null;
    dto.stagingLocationId = (record['stagingLocationId'] as string) ?? null;
    dto.scannedBarcodes = (record['scannedBarcodes'] as unknown[]) ?? [];
    dto.metadata = (record['metadata'] as Record<string, unknown>) ?? {};
    dto.createdAt = record['createdAt'] as Date;
    dto.updatedAt = record['updatedAt'] as Date;
    return dto;
  }
}

export class PickingExceptionResponseDto {
  id!: string;
  taskId!: string;
  lineId!: string | null;
  exceptionType!: ExceptionType;
  description!: string;
  quantity!: number | null;
  evidenceUrls!: string[];
  resolution!: string | null;
  resolvedBy!: string | null;
  resolvedAt!: Date | null;
  metadata!: Record<string, unknown>;
  createdAt!: Date;

  static from(record: Record<string, unknown>): PickingExceptionResponseDto {
    const dto = new PickingExceptionResponseDto();
    dto.id = record['id'] as string;
    dto.taskId = record['taskId'] as string;
    dto.lineId = (record['lineId'] as string) ?? null;
    dto.exceptionType = record['exceptionType'] as ExceptionType;
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

export class PickingResponseDto {
  id!: string;
  workspaceId!: string;
  taskNumber!: string;
  taskSequence!: number;
  status!: PickingStatus;
  pickingType!: PickingType;
  strategy!: PickingStrategy;
  warehouseId!: string;
  orderId!: string | null;
  transferId!: string | null;
  sourceType!: string;
  sourceId!: string | null;
  assignedTo!: string | null;
  assignedAt!: Date | null;
  releasedAt!: Date | null;
  startedAt!: Date | null;
  pausedAt!: Date | null;
  completedAt!: Date | null;
  totalQuantity!: number;
  pickedQuantity!: number;
  stagingLocationId!: string | null;
  priority!: number;
  waveId!: string | null;
  batchId!: string | null;
  notes!: string | null;
  metadata!: Record<string, unknown>;
  cancelReason!: string | null;
  cancelledBy!: string | null;
  cancelledAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt!: Date | null;
  lines?: PickingLineResponseDto[];
  exceptions?: PickingExceptionResponseDto[];

  static from(record: Record<string, unknown>, includeLines = false, includeExceptions = false): PickingResponseDto {
    const dto = new PickingResponseDto();
    dto.id = record['id'] as string;
    dto.workspaceId = record['workspaceId'] as string;
    dto.taskNumber = record['taskNumber'] as string;
    dto.taskSequence = record['taskSequence'] as number;
    dto.status = record['status'] as PickingStatus;
    dto.pickingType = record['pickingType'] as PickingType;
    dto.strategy = record['strategy'] as PickingStrategy;
    dto.warehouseId = record['warehouseId'] as string;
    dto.orderId = (record['orderId'] as string) ?? null;
    dto.transferId = (record['transferId'] as string) ?? null;
    dto.sourceType = record['sourceType'] as string;
    dto.sourceId = (record['sourceId'] as string) ?? null;
    dto.assignedTo = (record['assignedTo'] as string) ?? null;
    dto.assignedAt = (record['assignedAt'] as Date) ?? null;
    dto.releasedAt = (record['releasedAt'] as Date) ?? null;
    dto.startedAt = (record['startedAt'] as Date) ?? null;
    dto.pausedAt = (record['pausedAt'] as Date) ?? null;
    dto.completedAt = (record['completedAt'] as Date) ?? null;
    dto.totalQuantity = record['totalQuantity'] as number;
    dto.pickedQuantity = record['pickedQuantity'] as number;
    dto.stagingLocationId = (record['stagingLocationId'] as string) ?? null;
    dto.priority = record['priority'] as number;
    dto.waveId = (record['waveId'] as string) ?? null;
    dto.batchId = (record['batchId'] as string) ?? null;
    dto.notes = (record['notes'] as string) ?? null;
    dto.metadata = (record['metadata'] as Record<string, unknown>) ?? {};
    dto.cancelReason = (record['cancelReason'] as string) ?? null;
    dto.cancelledBy = (record['cancelledBy'] as string) ?? null;
    dto.cancelledAt = (record['cancelledAt'] as Date) ?? null;
    dto.createdAt = record['createdAt'] as Date;
    dto.updatedAt = record['updatedAt'] as Date;
    dto.deletedAt = (record['deletedAt'] as Date) ?? null;
    if (includeLines && record['lines']) {
      dto.lines = (record['lines'] as Record<string, unknown>[]).map(PickingLineResponseDto.from);
    }
    if (includeExceptions && record['exceptions']) {
      dto.exceptions = (record['exceptions'] as Record<string, unknown>[]).map(PickingExceptionResponseDto.from);
    }
    return dto;
  }
}

export class PickingListResponseDto {
  items!: PickingResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): PickingListResponseDto {
    const dto = new PickingListResponseDto();
    dto.items = items.map((item) => PickingResponseDto.from(item));
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}
