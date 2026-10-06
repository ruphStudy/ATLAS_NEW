import { ReceivingStatus, ReceiptType, ReceiptLineStatus, DiscrepancyType } from '../interfaces';

export class ReceivingLineResponseDto {
  id!: string;
  receivingId!: string;
  lineNumber!: number;
  status!: ReceiptLineStatus;
  inventoryItemId!: string | null;
  catalogProductId!: string | null;
  sku!: string | null;
  productName!: string | null;
  variantId!: string | null;
  batchNumber!: string | null;
  lotNumber!: string | null;
  serialNumber!: string | null;
  expiryDate!: Date | null;
  manufactureDate!: Date | null;
  expectedQuantity!: number;
  receivedQuantity!: number;
  acceptedQuantity!: number;
  rejectedQuantity!: number;
  damagedQuantity!: number;
  uom!: string;
  locationId!: string | null;
  binId!: string | null;
  stockStatus!: string;
  packageCount!: number | null;
  packageReference!: string | null;
  hasDiscrepancy!: boolean;
  discrepancyType!: DiscrepancyType | null;
  discrepancyReason!: string | null;
  discrepancyNotes!: string | null;
  evidenceUrls!: unknown | null;
  transactionId!: string | null;
  scannedBarcodes!: unknown[];
  metadata!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;

  static from(record: Record<string, unknown>): ReceivingLineResponseDto {
    const dto = new ReceivingLineResponseDto();
    dto.id = record['id'] as string;
    dto.receivingId = record['receivingId'] as string;
    dto.lineNumber = record['lineNumber'] as number;
    dto.status = record['status'] as ReceiptLineStatus;
    dto.inventoryItemId = (record['inventoryItemId'] as string) ?? null;
    dto.catalogProductId = (record['catalogProductId'] as string) ?? null;
    dto.sku = (record['sku'] as string) ?? null;
    dto.productName = (record['productName'] as string) ?? null;
    dto.variantId = (record['variantId'] as string) ?? null;
    dto.batchNumber = (record['batchNumber'] as string) ?? null;
    dto.lotNumber = (record['lotNumber'] as string) ?? null;
    dto.serialNumber = (record['serialNumber'] as string) ?? null;
    dto.expiryDate = (record['expiryDate'] as Date) ?? null;
    dto.manufactureDate = (record['manufactureDate'] as Date) ?? null;
    dto.expectedQuantity = record['expectedQuantity'] as number;
    dto.receivedQuantity = record['receivedQuantity'] as number;
    dto.acceptedQuantity = record['acceptedQuantity'] as number;
    dto.rejectedQuantity = record['rejectedQuantity'] as number;
    dto.damagedQuantity = record['damagedQuantity'] as number;
    dto.uom = record['uom'] as string;
    dto.locationId = (record['locationId'] as string) ?? null;
    dto.binId = (record['binId'] as string) ?? null;
    dto.stockStatus = record['stockStatus'] as string;
    dto.packageCount = (record['packageCount'] as number) ?? null;
    dto.packageReference = (record['packageReference'] as string) ?? null;
    dto.hasDiscrepancy = record['hasDiscrepancy'] as boolean;
    dto.discrepancyType = (record['discrepancyType'] as DiscrepancyType) ?? null;
    dto.discrepancyReason = (record['discrepancyReason'] as string) ?? null;
    dto.discrepancyNotes = (record['discrepancyNotes'] as string) ?? null;
    dto.evidenceUrls = record['evidenceUrls'] ?? null;
    dto.transactionId = (record['transactionId'] as string) ?? null;
    dto.scannedBarcodes = (record['scannedBarcodes'] as unknown[]) ?? [];
    dto.metadata = (record['metadata'] as Record<string, unknown>) ?? {};
    dto.createdAt = record['createdAt'] as Date;
    dto.updatedAt = record['updatedAt'] as Date;
    return dto;
  }
}

export class ReceivingResponseDto {
  id!: string;
  workspaceId!: string;
  receivingNumber!: string;
  receivingSequence!: number;
  status!: ReceivingStatus;
  type!: ReceiptType;
  warehouseId!: string;
  purchaseOrderId!: string | null;
  shipmentId!: string | null;
  transferId!: string | null;
  supplierId!: string | null;
  scheduledDate!: Date | null;
  expectedQuantity!: number | null;
  startedAt!: Date | null;
  completedAt!: Date | null;
  receivedQuantity!: number;
  acceptedQuantity!: number;
  rejectedQuantity!: number;
  damagedQuantity!: number;
  receivedBy!: string | null;
  approvedBy!: string | null;
  approvedAt!: Date | null;
  notes!: string | null;
  attachments!: unknown[];
  metadata!: Record<string, unknown>;
  cancelReason!: string | null;
  cancelledBy!: string | null;
  cancelledAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt!: Date | null;
  lines?: ReceivingLineResponseDto[];

  static from(record: Record<string, unknown>, includeLines = false): ReceivingResponseDto {
    const dto = new ReceivingResponseDto();
    dto.id = record['id'] as string;
    dto.workspaceId = record['workspaceId'] as string;
    dto.receivingNumber = record['receivingNumber'] as string;
    dto.receivingSequence = record['receivingSequence'] as number;
    dto.status = record['status'] as ReceivingStatus;
    dto.type = record['type'] as ReceiptType;
    dto.warehouseId = record['warehouseId'] as string;
    dto.purchaseOrderId = (record['purchaseOrderId'] as string) ?? null;
    dto.shipmentId = (record['shipmentId'] as string) ?? null;
    dto.transferId = (record['transferId'] as string) ?? null;
    dto.supplierId = (record['supplierId'] as string) ?? null;
    dto.scheduledDate = (record['scheduledDate'] as Date) ?? null;
    dto.expectedQuantity = (record['expectedQuantity'] as number) ?? null;
    dto.startedAt = (record['startedAt'] as Date) ?? null;
    dto.completedAt = (record['completedAt'] as Date) ?? null;
    dto.receivedQuantity = record['receivedQuantity'] as number;
    dto.acceptedQuantity = record['acceptedQuantity'] as number;
    dto.rejectedQuantity = record['rejectedQuantity'] as number;
    dto.damagedQuantity = record['damagedQuantity'] as number;
    dto.receivedBy = (record['receivedBy'] as string) ?? null;
    dto.approvedBy = (record['approvedBy'] as string) ?? null;
    dto.approvedAt = (record['approvedAt'] as Date) ?? null;
    dto.notes = (record['notes'] as string) ?? null;
    dto.attachments = (record['attachments'] as unknown[]) ?? [];
    dto.metadata = (record['metadata'] as Record<string, unknown>) ?? {};
    dto.cancelReason = (record['cancelReason'] as string) ?? null;
    dto.cancelledBy = (record['cancelledBy'] as string) ?? null;
    dto.cancelledAt = (record['cancelledAt'] as Date) ?? null;
    dto.createdAt = record['createdAt'] as Date;
    dto.updatedAt = record['updatedAt'] as Date;
    dto.deletedAt = (record['deletedAt'] as Date) ?? null;
    if (includeLines && record['lines']) {
      dto.lines = (record['lines'] as Record<string, unknown>[]).map(ReceivingLineResponseDto.from);
    }
    return dto;
  }
}

export class ReceivingListResponseDto {
  items!: ReceivingResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): ReceivingListResponseDto {
    const dto = new ReceivingListResponseDto();
    dto.items = items.map((item) => ReceivingResponseDto.from(item));
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}
