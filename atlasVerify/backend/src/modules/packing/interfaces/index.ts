export enum PackingStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REOPENED = 'REOPENED',
}

export enum PackingType {
  SINGLE = 'SINGLE',
  BATCH = 'BATCH',
  MULTI_PACKAGE = 'MULTI_PACKAGE',
}

export enum PackageType {
  BOX = 'BOX',
  ENVELOPE = 'ENVELOPE',
  TUBE = 'TUBE',
  PALLET = 'PALLET',
  CRATE = 'CRATE',
  POLYBAG = 'POLYBAG',
  CUSTOM = 'CUSTOM',
}

export enum PackingExceptionType {
  MISSING = 'MISSING',
  DAMAGED = 'DAMAGED',
  EXCESS = 'EXCESS',
  MISMATCHED = 'MISMATCHED',
  PACKAGE_INCOMPATIBLE = 'PACKAGE_INCOMPATIBLE',
  OTHER = 'OTHER',
}

export enum PackingEvent {
  CREATED = 'packing.created',
  ASSIGNED = 'packing.assigned',
  STARTED = 'packing.started',
  PAUSED = 'packing.paused',
  RESUMED = 'packing.resumed',
  LINE_PACKED = 'packing.line_packed',
  PACKAGE_CREATED = 'packing.package_created',
  PACKAGE_COMPLETED = 'packing.package_completed',
  COMPLETED = 'packing.completed',
  CANCELLED = 'packing.cancelled',
  REOPENED = 'packing.reopened',
  EXCEPTION_RECORDED = 'packing.exception_recorded',
}

export interface IPackingTask {
  id: string;
  workspaceId: string;
  taskNumber: string;
  taskSequence: number;
  status: PackingStatus;
  packingType: PackingType;
  warehouseId: string;
  pickingTaskId?: string | null;
  orderId?: string | null;
  shipmentId?: string | null;
  sourceType: string;
  sourceId?: string | null;
  assignedTo?: string | null;
  assignedAt?: Date | null;
  startedAt?: Date | null;
  pausedAt?: Date | null;
  completedAt?: Date | null;
  totalQuantity: number;
  packedQuantity: number;
  dispatchLocationId?: string | null;
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

export interface IPackingTaskLine {
  id: string;
  taskId: string;
  workspaceId: string;
  lineNumber: number;
  status: PackingStatus;
  pickingLineId?: string | null;
  inventoryItemId?: string | null;
  sku?: string | null;
  productName?: string | null;
  variantId?: string | null;
  batchNumber?: string | null;
  serialNumber?: string | null;
  pickedQuantity: number;
  packedQuantity: number;
  uom: string;
  packageId?: string | null;
  transactionId?: string | null;
  scannedBarcodes: unknown[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPackingTaskPackage {
  id: string;
  taskId: string;
  workspaceId: string;
  packageNumber: string;
  packageId: string;
  packageType: PackageType;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  dimensionUnit: string;
  weight?: number | null;
  weightUnit: string;
  maxWeight?: number | null;
  contents: unknown[];
  packingMaterial: unknown[];
  labelUrl?: string | null;
  packingSlipUrl?: string | null;
  evidenceUrls: string[];
  shipmentReady: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPackingException {
  id: string;
  taskId: string;
  lineId?: string | null;
  packageId?: string | null;
  workspaceId: string;
  exceptionType: PackingExceptionType;
  description: string;
  quantity?: number | null;
  evidenceUrls: string[];
  resolution?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}
