export enum PutawayStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

export enum PutawayStrategy {
  FIXED_BIN = 'FIXED_BIN',
  NEAREST_AVAILABLE = 'NEAREST_AVAILABLE',
  BEST_FIT_CAPACITY = 'BEST_FIT_CAPACITY',
  PRODUCT_CATEGORY = 'PRODUCT_CATEGORY',
  STORAGE_CONDITION = 'STORAGE_CONDITION',
  FIFO = 'FIFO',
  FEFO = 'FEFO',
  BATCH_LOT = 'BATCH_LOT',
  SERIAL_NUMBER = 'SERIAL_NUMBER',
  PRIORITY_ZONE = 'PRIORITY_ZONE',
}

export enum PutawayEvent {
  CREATED = 'putaway.created',
  ASSIGNED = 'putaway.assigned',
  STARTED = 'putaway.started',
  LINE_COMPLETED = 'putaway.line_completed',
  COMPLETED = 'putaway.completed',
  CANCELLED = 'putaway.cancelled',
  REASSIGNED = 'putaway.reassigned',
  EXCEPTION = 'putaway.exception',
}

export interface IPutawayTask {
  id: string;
  workspaceId: string;
  taskNumber: string;
  taskSequence: number;
  status: PutawayStatus;
  strategy: PutawayStrategy;
  warehouseId: string;
  receivingId?: string | null;
  sourceType: string;
  sourceId?: string | null;
  assignedTo?: string | null;
  assignedAt?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  totalQuantity: number;
  putawayQuantity: number;
  priority: number;
  notes?: string | null;
  metadata: Record<string, unknown>;
  cancelReason?: string | null;
  cancelledBy?: string | null;
  cancelledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IPutawayTaskLine {
  id: string;
  taskId: string;
  workspaceId: string;
  lineNumber: number;
  status: PutawayStatus;
  inventoryItemId?: string | null;
  sku?: string | null;
  productName?: string | null;
  batchNumber?: string | null;
  serialNumber?: string | null;
  sourceLocationId?: string | null;
  sourceBinId?: string | null;
  recommendedZoneId?: string | null;
  recommendedLocationId?: string | null;
  recommendedBinId?: string | null;
  destinationZoneId?: string | null;
  destinationLocationId?: string | null;
  destinationBinId?: string | null;
  overrideReason?: string | null;
  quantity: number;
  putawayQuantity: number;
  uom: string;
  capacityReservationId?: string | null;
  transactionId?: string | null;
  scannedBarcodes: unknown[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
