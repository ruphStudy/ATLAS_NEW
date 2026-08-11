import { PutawayStatus, PutawayStrategy } from '../interfaces';

export class PutawayLineResponseDto {
  id!: string;
  taskId!: string;
  lineNumber!: number;
  status!: PutawayStatus;
  inventoryItemId!: string | null;
  sku!: string | null;
  productName!: string | null;
  batchNumber!: string | null;
  serialNumber!: string | null;
  sourceLocationId!: string | null;
  sourceBinId!: string | null;
  recommendedZoneId!: string | null;
  recommendedLocationId!: string | null;
  recommendedBinId!: string | null;
  destinationZoneId!: string | null;
  destinationLocationId!: string | null;
  destinationBinId!: string | null;
  overrideReason!: string | null;
  quantity!: number;
  putawayQuantity!: number;
  uom!: string;
  capacityReservationId!: string | null;
  transactionId!: string | null;
  scannedBarcodes!: unknown[];
  metadata!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;

  static from(record: Record<string, unknown>): PutawayLineResponseDto {
    const dto = new PutawayLineResponseDto();
    dto.id = record['id'] as string;
    dto.taskId = record['taskId'] as string;
    dto.lineNumber = record['lineNumber'] as number;
    dto.status = record['status'] as PutawayStatus;
    dto.inventoryItemId = (record['inventoryItemId'] as string) ?? null;
    dto.sku = (record['sku'] as string) ?? null;
    dto.productName = (record['productName'] as string) ?? null;
    dto.batchNumber = (record['batchNumber'] as string) ?? null;
    dto.serialNumber = (record['serialNumber'] as string) ?? null;
    dto.sourceLocationId = (record['sourceLocationId'] as string) ?? null;
    dto.sourceBinId = (record['sourceBinId'] as string) ?? null;
    dto.recommendedZoneId = (record['recommendedZoneId'] as string) ?? null;
    dto.recommendedLocationId = (record['recommendedLocationId'] as string) ?? null;
    dto.recommendedBinId = (record['recommendedBinId'] as string) ?? null;
    dto.destinationZoneId = (record['destinationZoneId'] as string) ?? null;
    dto.destinationLocationId = (record['destinationLocationId'] as string) ?? null;
    dto.destinationBinId = (record['destinationBinId'] as string) ?? null;
    dto.overrideReason = (record['overrideReason'] as string) ?? null;
    dto.quantity = record['quantity'] as number;
    dto.putawayQuantity = record['putawayQuantity'] as number;
    dto.uom = record['uom'] as string;
    dto.capacityReservationId = (record['capacityReservationId'] as string) ?? null;
    dto.transactionId = (record['transactionId'] as string) ?? null;
    dto.scannedBarcodes = (record['scannedBarcodes'] as unknown[]) ?? [];
    dto.metadata = (record['metadata'] as Record<string, unknown>) ?? {};
    dto.createdAt = record['createdAt'] as Date;
    dto.updatedAt = record['updatedAt'] as Date;
    return dto;
  }
}

export class PutawayResponseDto {
  id!: string;
  workspaceId!: string;
  taskNumber!: string;
  taskSequence!: number;
  status!: PutawayStatus;
  strategy!: PutawayStrategy;
  warehouseId!: string;
  receivingId!: string | null;
  sourceType!: string;
  sourceId!: string | null;
  assignedTo!: string | null;
  assignedAt!: Date | null;
  startedAt!: Date | null;
  completedAt!: Date | null;
  totalQuantity!: number;
  putawayQuantity!: number;
  priority!: number;
  notes!: string | null;
  metadata!: Record<string, unknown>;
  cancelReason!: string | null;
  cancelledBy!: string | null;
  cancelledAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt!: Date | null;
  lines?: PutawayLineResponseDto[];

  static from(record: Record<string, unknown>, includeLines = false): PutawayResponseDto {
    const dto = new PutawayResponseDto();
    dto.id = record['id'] as string;
    dto.workspaceId = record['workspaceId'] as string;
    dto.taskNumber = record['taskNumber'] as string;
    dto.taskSequence = record['taskSequence'] as number;
    dto.status = record['status'] as PutawayStatus;
    dto.strategy = record['strategy'] as PutawayStrategy;
    dto.warehouseId = record['warehouseId'] as string;
    dto.receivingId = (record['receivingId'] as string) ?? null;
    dto.sourceType = record['sourceType'] as string;
    dto.sourceId = (record['sourceId'] as string) ?? null;
    dto.assignedTo = (record['assignedTo'] as string) ?? null;
    dto.assignedAt = (record['assignedAt'] as Date) ?? null;
    dto.startedAt = (record['startedAt'] as Date) ?? null;
    dto.completedAt = (record['completedAt'] as Date) ?? null;
    dto.totalQuantity = record['totalQuantity'] as number;
    dto.putawayQuantity = record['putawayQuantity'] as number;
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
      dto.lines = (record['lines'] as Record<string, unknown>[]).map(PutawayLineResponseDto.from);
    }
    return dto;
  }
}

export class PutawayListResponseDto {
  items!: PutawayResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): PutawayListResponseDto {
    const dto = new PutawayListResponseDto();
    dto.items = items.map((item) => PutawayResponseDto.from(item));
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}
