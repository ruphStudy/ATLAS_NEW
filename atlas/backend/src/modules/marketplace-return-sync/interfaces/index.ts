export enum ReturnItemType {
  ALL = 'ALL',
  FULL = 'FULL',
  PARTIAL = 'PARTIAL',
  MULTI_ITEM = 'MULTI_ITEM',
}

export enum ReturnSyncEvent {
  REQUESTED = 'REQUESTED',
  STARTED = 'STARTED',
  COMPLETED = 'COMPLETED',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  CONFLICT_DETECTED = 'CONFLICT_DETECTED',
  RETURN_IMPORTED = 'RETURN_IMPORTED',
  RETURN_UPDATED = 'RETURN_UPDATED',
  RETURN_APPROVED = 'RETURN_APPROVED',
  RETURN_REJECTED = 'RETURN_REJECTED',
  RETURN_CANCELLED = 'RETURN_CANCELLED',
  PICKUP_SCHEDULED = 'PICKUP_SCHEDULED',
  RECEIVED = 'RECEIVED',
  INSPECTED = 'INSPECTED',
  REFUNDED = 'REFUNDED',
  REPLACED = 'REPLACED',
}

export enum SyncDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
  BIDIRECTIONAL = 'BIDIRECTIONAL',
}

export enum SyncScope {
  FULL = 'FULL',
  INCREMENTAL = 'INCREMENTAL',
  DELTA = 'DELTA',
}

export enum SyncTrigger {
  MANUAL = 'MANUAL',
  SCHEDULED = 'SCHEDULED',
  WEBHOOK = 'WEBHOOK',
  API = 'API',
}

export enum SyncJobStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum SyncItemStatus {
  SYNCED = 'SYNCED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
  CONFLICT = 'CONFLICT',
}

export enum SyncItemOperation {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  CANCEL = 'CANCEL',
  REFUND = 'REFUND',
  REPLACE = 'REPLACE',
  NOOP = 'NOOP',
}

export enum ConflictStrategy {
  MARKETPLACE_WINS = 'MARKETPLACE_WINS',
  ATLAS_WINS = 'ATLAS_WINS',
  NEWEST_WINS = 'NEWEST_WINS',
  SKIP = 'SKIP',
  FLAG = 'FLAG',
}

export enum ReturnConflictType {
  STATUS_MISMATCH = 'STATUS_MISMATCH',
  REFUND_AMOUNT_MISMATCH = 'REFUND_AMOUNT_MISMATCH',
  ITEM_COUNT_MISMATCH = 'ITEM_COUNT_MISMATCH',
  RESOLUTION_MISMATCH = 'RESOLUTION_MISMATCH',
  DUPLICATE_RETURN = 'DUPLICATE_RETURN',
}

export interface IReturnSyncJob {
  id: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  direction: SyncDirection;
  scope: SyncScope;
  itemType: ReturnItemType;
  trigger: SyncTrigger;
  status: SyncJobStatus;
  conflictStrategy: ConflictStrategy | null;
  filterOptions: Record<string, unknown> | null;
  scheduleId: string | null;
  correlationId: string;
  cursor: string | null;
  totalItems: number | null;
  processedItems: number;
  importedReturns: number;
  updatedReturns: number;
  approvedReturns: number;
  rejectedReturns: number;
  refundedReturns: number;
  failedItems: number;
  conflictItems: number;
  skippedItems: number;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReturnSyncSchedule {
  id: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  direction: SyncDirection;
  scope: SyncScope;
  itemType: ReturnItemType;
  conflictStrategy: ConflictStrategy | null;
  intervalMs: number;
  enabled: boolean;
  lastRunAt: Date | null;
  lastJobId: string | null;
  nextRunAt: Date | null;
  filterOptions: Record<string, unknown> | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface NormalizedReturnItem {
  externalReturnId: string;
  externalOrderId?: string;
  externalRmaNumber?: string;
  returnDate?: Date;
  status?: string;
  reason?: string;
  reasonCode?: string;
  customerComments?: string;
  items?: Array<{
    externalItemId?: string;
    externalOrderItemId?: string;
    sku?: string;
    title?: string;
    quantityRequested?: number;
    quantityReceived?: number;
    quantityApproved?: number;
    condition?: string;
    defectDescription?: string;
  }>;
  refund?: {
    externalRefundId?: string;
    amount?: number;
    currency?: string;
    status?: string;
    method?: string;
    processedAt?: Date;
  };
  replacement?: {
    externalReplacementId?: string;
    status?: string;
    shipmentId?: string;
    trackingNumber?: string;
  };
  pickup?: {
    externalPickupId?: string;
    carrier?: string;
    trackingNumber?: string;
    scheduledDate?: Date;
    completedDate?: Date;
  };
  resolution?: string;
  resolutionDate?: Date;
  inspectionNotes?: string;
  internalNotes?: string;
  restockFee?: number;
  totalRefundAmount?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}

export interface ReturnSyncRequest {
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  direction?: SyncDirection;
  scope?: SyncScope;
  itemType?: ReturnItemType;
  trigger?: SyncTrigger;
  conflictStrategy?: ConflictStrategy;
  filterOptions?: Record<string, unknown>;
  scheduleId?: string;
  correlationId?: string;
  createdBy?: string | null;
}

export interface RetryFailedReturnItemsRequest {
  jobId: string;
  workspaceId: string;
  itemIds?: string[];
  createdBy?: string | null;
}

export interface ReturnSyncJobFilter {
  workspaceId: string;
  accountId?: string;
  providerKey?: string;
  marketplaceKey?: string;
  status?: SyncJobStatus;
  trigger?: SyncTrigger;
  scheduleId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface ReturnItemSyncResult {
  externalId: string | null;
  internalId?: string | null;
  rmaNumber?: string | null;
  itemType: ReturnItemType;
  operation: SyncItemOperation;
  status: SyncItemStatus;
  errorCode?: string | null;
  errorMessage?: string | null;
  retryable: boolean;
}

export interface ReturnSyncAdapter {
  fetchReturns?: (request: {
    providerKey: string;
    accountId: string;
    cursor?: string | null;
    pageSize?: number;
    filterOptions?: Record<string, unknown> | null;
  }) => Promise<{
    returns: Record<string, unknown>[];
    nextCursor?: string | null;
    totalCount?: number | null;
  }>;

  pushReturnDecision?: (request: {
    providerKey: string;
    accountId: string;
    externalReturnId: string;
    decision: 'APPROVE' | 'REJECT';
    reason?: string;
    refundAmount?: number;
  }) => Promise<{
    success: boolean;
    errorCode?: string;
    errorMessage?: string;
  }>;

  updateReturnStatus?: (request: {
    providerKey: string;
    accountId: string;
    externalReturnId: string;
    status: string;
    updates: Partial<NormalizedReturnItem>;
  }) => Promise<{
    success: boolean;
    errorCode?: string;
    errorMessage?: string;
  }>;

  processRefund?: (request: {
    providerKey: string;
    accountId: string;
    externalReturnId: string;
    refundAmount: number;
    currency?: string;
    reason?: string;
  }) => Promise<{
    success: boolean;
    externalRefundId?: string;
    errorCode?: string;
    errorMessage?: string;
  }>;
}

export interface ReturnConflictDetectionResult {
  hasConflict: boolean;
  conflictType?: ReturnConflictType;
  details?: {
    field: string;
    atlasValue: unknown;
    marketplaceValue: unknown;
  }[];
}

export interface ReturnSyncEventPayload {
  event: ReturnSyncEvent;
  jobId: string;
  correlationId: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  direction: SyncDirection;
  scope: SyncScope;
  itemType: ReturnItemType;
  status?: SyncJobStatus;
  externalReturnId?: string | null;
  internalReturnId?: string | null;
  rmaNumber?: string | null;
  conflictType?: ReturnConflictType | null;
  processedItems?: number;
  totalItems?: number;
  failedItems?: number;
  timestamp: Date;
}
