export enum ReceivingStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  CANCELLED = 'CANCELLED',
  REOPENED = 'REOPENED',
}

export enum ReceiptType {
  PURCHASE_ORDER = 'PURCHASE_ORDER',
  TRANSFER = 'TRANSFER',
  RETURN = 'RETURN',
  MANUAL = 'MANUAL',
}

export enum ReceiptLineStatus {
  PENDING = 'PENDING',
  RECEIVED = 'RECEIVED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  SHORT = 'SHORT',
  EXCESS = 'EXCESS',
  DAMAGED = 'DAMAGED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum DiscrepancyType {
  SHORT = 'SHORT',
  EXCESS = 'EXCESS',
  DAMAGED = 'DAMAGED',
  WRONG_PRODUCT = 'WRONG_PRODUCT',
  QUALITY_ISSUE = 'QUALITY_ISSUE',
  PACKAGING_ISSUE = 'PACKAGING_ISSUE',
  EXPIRY_ISSUE = 'EXPIRY_ISSUE',
  OTHER = 'OTHER',
}

export enum ReceivingEvent {
  CREATED = 'receiving.created',
  SCHEDULED = 'receiving.scheduled',
  STARTED = 'receiving.started',
  LINE_RECEIVED = 'receiving.line_received',
  DISCREPANCY_REPORTED = 'receiving.discrepancy_reported',
  COMPLETED = 'receiving.completed',
  CANCELLED = 'receiving.cancelled',
  REOPENED = 'receiving.reopened',
}

export interface IWarehouseReceiving {
  id: string;
  workspaceId: string;
  receivingNumber: string;
  receivingSequence: number;
  status: ReceivingStatus;
  type: ReceiptType;
  warehouseId: string;
  purchaseOrderId?: string | null;
  shipmentId?: string | null;
  transferId?: string | null;
  supplierId?: string | null;
  scheduledDate?: Date | null;
  expectedQuantity?: number | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  damagedQuantity: number;
  receivedBy?: string | null;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  notes?: string | null;
  attachments: unknown[];
  metadata: Record<string, unknown>;
  cancelReason?: string | null;
  cancelledBy?: string | null;
  cancelledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IWarehouseReceivingLine {
  id: string;
  receivingId: string;
  workspaceId: string;
  lineNumber: number;
  status: ReceiptLineStatus;
  inventoryItemId?: string | null;
  catalogProductId?: string | null;
  sku?: string | null;
  productName?: string | null;
  variantId?: string | null;
  batchNumber?: string | null;
  lotNumber?: string | null;
  serialNumber?: string | null;
  expiryDate?: Date | null;
  manufactureDate?: Date | null;
  expectedQuantity: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  damagedQuantity: number;
  uom: string;
  locationId?: string | null;
  binId?: string | null;
  stockStatus: string;
  packageCount?: number | null;
  packageReference?: string | null;
  hasDiscrepancy: boolean;
  discrepancyType?: DiscrepancyType | null;
  discrepancyReason?: string | null;
  discrepancyNotes?: string | null;
  evidenceUrls?: unknown | null;
  transactionId?: string | null;
  scannedBarcodes: unknown[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
