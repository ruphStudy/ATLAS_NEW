export enum WarehouseAuditActorType {
  USER = 'USER',
  SYSTEM = 'SYSTEM',
  SCHEDULER = 'SCHEDULER',
  SCANNER = 'SCANNER',
  INTEGRATION = 'INTEGRATION',
  MARKETPLACE = 'MARKETPLACE',
  API = 'API',
}

export enum WarehouseAuditActionType {
  RECEIVING = 'RECEIVING',
  PUTAWAY = 'PUTAWAY',
  MOVEMENT = 'MOVEMENT',
  TRANSFER = 'TRANSFER',
  ADJUSTMENT = 'ADJUSTMENT',
  COUNT = 'COUNT',
  PICKING = 'PICKING',
  PACKING = 'PACKING',
  DISPATCH = 'DISPATCH',
  CREATION = 'CREATION',
  UPDATE = 'UPDATE',
  DELETION = 'DELETION',
  STATUS_CHANGE = 'STATUS_CHANGE',
  CONFIGURATION = 'CONFIGURATION',
  SYNC = 'SYNC',
  SCAN = 'SCAN',
  LABEL_PRINT = 'LABEL_PRINT',
  OTHER = 'OTHER',
}

export enum WarehouseAuditEntityType {
  WAREHOUSE = 'WAREHOUSE',
  ZONE = 'ZONE',
  LOCATION = 'LOCATION',
  BIN = 'BIN',
  INVENTORY_ITEM = 'INVENTORY_ITEM',
  INVENTORY_STOCK = 'INVENTORY_STOCK',
  INVENTORY_TRANSACTION = 'INVENTORY_TRANSACTION',
  RECEIVING = 'RECEIVING',
  PUTAWAY_TASK = 'PUTAWAY_TASK',
  TRANSFER = 'TRANSFER',
  PICKING_TASK = 'PICKING_TASK',
  PACKING_TASK = 'PACKING_TASK',
  DISPATCH = 'DISPATCH',
  SHIPMENT = 'SHIPMENT',
  BARCODE = 'BARCODE',
  OTHER = 'OTHER',
}

export enum WarehouseAuditOutcome {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  PARTIAL = 'PARTIAL',
  PENDING = 'PENDING',
  CANCELLED = 'CANCELLED',
}

export enum WarehouseAuditEvent {
  AUDIT_RECORDED = 'warehouse-audit.recorded',
  SUSPICIOUS_ACTIVITY = 'warehouse-audit.suspicious_activity',
}

export interface IWarehouseAuditLog {
  id: string;
  workspaceId: string;
  warehouseId?: string | null;
  actorType: WarehouseAuditActorType;
  actorId?: string | null;
  actorName?: string | null;
  actionType: WarehouseAuditActionType;
  actionDescription?: string | null;
  entityType: WarehouseAuditEntityType;
  entityId?: string | null;
  entityReference?: string | null;
  outcome: WarehouseAuditOutcome;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  changes?: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  reason?: string | null;
  errorMessage?: string | null;
  correlationId?: string | null;
  requestId?: string | null;
  jobId?: string | null;
  barcodeId?: string | null;
  externalReference?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  module?: string | null;
  operation?: string | null;
  suspicious: boolean;
  suspiciousReason?: string | null;
  timestamp: Date;
}
