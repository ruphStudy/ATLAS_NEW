export enum PickingStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  RELEASED = 'RELEASED',
  IN_PROGRESS = 'IN_PROGRESS',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

export enum PickingType {
  SINGLE = 'SINGLE',
  BATCH = 'BATCH',
  WAVE = 'WAVE',
  ZONE = 'ZONE',
  PRIORITY = 'PRIORITY',
}

export enum PickingStrategy {
  FIFO = 'FIFO',
  FEFO = 'FEFO',
  ALLOCATION = 'ALLOCATION',
  WAREHOUSE_PRIORITY = 'WAREHOUSE_PRIORITY',
}

export enum ExceptionType {
  MISSING = 'MISSING',
  DAMAGED = 'DAMAGED',
  EXPIRED = 'EXPIRED',
  MISMATCHED = 'MISMATCHED',
  SHORT = 'SHORT',
  OTHER = 'OTHER',
}

export enum PickingEvent {
  CREATED = 'picking.created',
  ASSIGNED = 'picking.assigned',
  RELEASED = 'picking.released',
  STARTED = 'picking.started',
  PAUSED = 'picking.paused',
  RESUMED = 'picking.resumed',
  LINE_PICKED = 'picking.line_picked',
  COMPLETED = 'picking.completed',
  CANCELLED = 'picking.cancelled',
  REASSIGNED = 'picking.reassigned',
  EXCEPTION_RECORDED = 'picking.exception_recorded',
}

export interface IPickingTask {
  id: string;
  workspaceId: string;
  taskNumber: string;
  taskSequence: number;
  status: PickingStatus;
  pickingType: PickingType;
  strategy: PickingStrategy;
  warehouseId: string;
  orderId?: string | null;
  transferId?: string | null;
  sourceType: string;
  sourceId?: string | null;
  assignedTo?: string | null;
  assignedAt?: Date | null;
  releasedAt?: Date | null;
  startedAt?: Date | null;
  pausedAt?: Date | null;
  completedAt?: Date | null;
  totalQuantity: number;
  pickedQuantity: number;
  stagingLocationId?: string | null;
  priority: number;
  waveId?: string | null;
  batchId?: string | null;
  notes?: string | null;
  metadata: Record<string, unknown>;
  cancelReason?: string | null;
  cancelledBy?: string | null;
  cancelledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IPickingTaskLine {
  id: string;
  taskId: string;
  workspaceId: string;
  lineNumber: number;
  status: PickingStatus;
  inventoryItemId?: string | null;
  allocationId?: string | null;
  reservationId?: string | null;
  sku?: string | null;
  productName?: string | null;
  variantId?: string | null;
  batchNumber?: string | null;
  serialNumber?: string | null;
  expiryDate?: Date | null;
  sourceZoneId?: string | null;
  sourceLocationId?: string | null;
  sourceBinId?: string | null;
  requestedQuantity: number;
  pickedQuantity: number;
  shortQuantity: number;
  uom: string;
  transactionId?: string | null;
  stagingLocationId?: string | null;
  scannedBarcodes: unknown[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPickingException {
  id: string;
  taskId: string;
  lineId?: string | null;
  workspaceId: string;
  exceptionType: ExceptionType;
  description: string;
  quantity?: number | null;
  evidenceUrls: string[];
  resolution?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}
