export enum DispatchStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REOPENED = 'REOPENED',
}

export enum DispatchType {
  SINGLE = 'SINGLE',
  BATCH = 'BATCH',
  WAVE = 'WAVE',
  CARRIER_WISE = 'CARRIER_WISE',
}

export enum DispatchExceptionType {
  MISSING = 'MISSING',
  DAMAGED = 'DAMAGED',
  CANCELLED = 'CANCELLED',
  MISMATCHED = 'MISMATCHED',
  OTHER = 'OTHER',
}

export enum DispatchEvent {
  CREATED = 'dispatch.created',
  ASSIGNED = 'dispatch.assigned',
  STARTED = 'dispatch.started',
  PACKAGE_DISPATCHED = 'dispatch.package_dispatched',
  MANIFEST_GENERATED = 'dispatch.manifest_generated',
  HANDOVER_COMPLETED = 'dispatch.handover_completed',
  COMPLETED = 'dispatch.completed',
  CANCELLED = 'dispatch.cancelled',
  REOPENED = 'dispatch.reopened',
  EXCEPTION_RECORDED = 'dispatch.exception_recorded',
}

export interface IDispatchTask {
  id: string;
  workspaceId: string;
  taskNumber: string;
  taskSequence: number;
  status: DispatchStatus;
  dispatchType: DispatchType;
  warehouseId: string;
  packingTaskId?: string | null;
  orderId?: string | null;
  shipmentId?: string | null;
  sourceType: string;
  sourceId?: string | null;
  assignedTo?: string | null;
  assignedAt?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  totalPackages: number;
  dispatchedPackages: number;
  carrierId?: string | null;
  carrierName?: string | null;
  serviceType?: string | null;
  manifestId?: string | null;
  manifestUrl?: string | null;
  pickupReference?: string | null;
  dispatchReference?: string | null;
  dispatchNoteUrl?: string | null;
  handoverUrl?: string | null;
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

export interface IDispatchTaskPackage {
  id: string;
  taskId: string;
  workspaceId: string;
  packageId: string;
  packingPackageId?: string | null;
  orderId?: string | null;
  shipmentId?: string | null;
  trackingNumber?: string | null;
  weight?: number | null;
  weightUnit: string;
  dispatched: boolean;
  dispatchedAt?: Date | null;
  scannedBarcodes: unknown[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDispatchException {
  id: string;
  taskId: string;
  packageId?: string | null;
  workspaceId: string;
  exceptionType: DispatchExceptionType;
  description: string;
  evidenceUrls: string[];
  resolution?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}
