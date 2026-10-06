export enum WarehouseSyncType {
  FULL = 'FULL',
  INCREMENTAL = 'INCREMENTAL',
  MANUAL = 'MANUAL',
  SCHEDULED = 'SCHEDULED',
}

export enum WarehouseSyncStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum WarehouseSyncDirection {
  UNIDIRECTIONAL = 'UNIDIRECTIONAL',
  BIDIRECTIONAL = 'BIDIRECTIONAL',
}

export enum WarehouseSyncConflictStrategy {
  SOURCE_WINS = 'SOURCE_WINS',
  TARGET_WINS = 'TARGET_WINS',
  LATEST_WINS = 'LATEST_WINS',
  HIGHEST_WINS = 'HIGHEST_WINS',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
}

export enum WarehouseSyncEvent {
  SYNC_STARTED = 'warehouse-sync.started',
  SYNC_PROGRESSED = 'warehouse-sync.progressed',
  SYNC_COMPLETED = 'warehouse-sync.completed',
  SYNC_FAILED = 'warehouse-sync.failed',
  SYNC_PAUSED = 'warehouse-sync.paused',
  SYNC_RESUMED = 'warehouse-sync.resumed',
  SYNC_CANCELLED = 'warehouse-sync.cancelled',
  CONFLICT_DETECTED = 'warehouse-sync.conflict_detected',
  CONFLICT_RESOLVED = 'warehouse-sync.conflict_resolved',
  MISMATCH_DETECTED = 'warehouse-sync.mismatch_detected',
  STALE_DATA_DETECTED = 'warehouse-sync.stale_data_detected',
}

export interface IWarehouseSyncConfiguration {
  id: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  sourceWarehouseId: string;
  targetWarehouseId: string;
  syncType: WarehouseSyncType;
  syncDirection: WarehouseSyncDirection;
  conflictStrategy: WarehouseSyncConflictStrategy;
  syncAvailable: boolean;
  syncReserved: boolean;
  syncAllocated: boolean;
  syncBlocked: boolean;
  syncDamaged: boolean;
  syncInTransit: boolean;
  syncIncoming: boolean;
  scheduleEnabled: boolean;
  scheduleCron?: string | null;
  batchSize: number;
  maxRetries: number;
  retryDelaySeconds: number;
  filterByRegion?: string | null;
  filterByChannel?: string | null;
  filterByMarketplaceAccountId?: string | null;
  filterBySku: string[];
  enabled: boolean;
  priority: number;
  recalculateAvailability: boolean;
  metadata: Record<string, unknown>;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IWarehouseSyncJob {
  id: string;
  workspaceId: string;
  jobNumber: string;
  jobSequence: number;
  configurationId: string;
  status: WarehouseSyncStatus;
  sourceWarehouseId: string;
  targetWarehouseId: string;
  syncType: WarehouseSyncType;
  syncDirection: WarehouseSyncDirection;
  totalItems: number;
  processedItems: number;
  successItems: number;
  failedItems: number;
  conflictItems: number;
  cursor?: string | null;
  lastSyncVersion?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  pausedAt?: Date | null;
  cancelledAt?: Date | null;
  errorMessage?: string | null;
  errorDetails?: Record<string, unknown> | null;
  progressPercentage: number;
  idempotencyKey?: string | null;
  metadata: Record<string, unknown>;
  triggeredBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWarehouseSyncConflict {
  id: string;
  syncJobId: string;
  workspaceId: string;
  inventoryItemId: string;
  sku?: string | null;
  sourceWarehouseId: string;
  targetWarehouseId: string;
  sourceQuantity: number;
  targetQuantity: number;
  sourceVersion?: string | null;
  targetVersion?: string | null;
  sourceUpdatedAt?: Date | null;
  targetUpdatedAt?: Date | null;
  conflictType: string;
  conflictReason?: string | null;
  conflictStrategy: WarehouseSyncConflictStrategy;
  resolved: boolean;
  resolvedAt?: Date | null;
  resolvedBy?: string | null;
  resolutionAction?: string | null;
  resolutionNotes?: string | null;
  sourceData?: Record<string, unknown> | null;
  targetData?: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}
