export enum ShipmentItemType {
  ALL = 'ALL',
  STANDARD = 'STANDARD',
  PARTIAL = 'PARTIAL',
  MULTI_PACKAGE = 'MULTI_PACKAGE',
}

export enum ShipmentSyncEvent {
  REQUESTED = 'REQUESTED',
  STARTED = 'STARTED',
  COMPLETED = 'COMPLETED',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  CONFLICT_DETECTED = 'CONFLICT_DETECTED',
  SHIPMENT_IMPORTED = 'SHIPMENT_IMPORTED',
  SHIPMENT_UPDATED = 'SHIPMENT_UPDATED',
  SHIPMENT_CANCELLED = 'SHIPMENT_CANCELLED',
  TRACKING_UPDATED = 'TRACKING_UPDATED',
  DELIVERY_CONFIRMED = 'DELIVERY_CONFIRMED',
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
  CANCEL = 'CANCEL',
  TRACK = 'TRACK',
  DELIVER = 'DELIVER',
  NOOP = 'NOOP',
}

export enum ConflictStrategy {
  MARKETPLACE_WINS = 'MARKETPLACE_WINS',
  ATLAS_WINS = 'ATLAS_WINS',
  NEWEST_WINS = 'NEWEST_WINS',
  SKIP = 'SKIP',
  FLAG = 'FLAG',
}

export enum ShipmentConflictType {
  STATUS_MISMATCH = 'STATUS_MISMATCH',
  TRACKING_MISMATCH = 'TRACKING_MISMATCH',
  CARRIER_MISMATCH = 'CARRIER_MISMATCH',
  PACKAGE_COUNT_MISMATCH = 'PACKAGE_COUNT_MISMATCH',
  DELIVERY_DATE_MISMATCH = 'DELIVERY_DATE_MISMATCH',
  DUPLICATE_SHIPMENT = 'DUPLICATE_SHIPMENT',
}

export interface IShipmentSyncJob {
  id: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  direction: SyncDirection;
  scope: SyncScope;
  itemType: ShipmentItemType;
  trigger: SyncTrigger;
  status: SyncJobStatus;
  conflictStrategy: ConflictStrategy | null;
  filterOptions: Record<string, unknown> | null;
  scheduleId: string | null;
  correlationId: string;
  cursor: string | null;
  totalItems: number | null;
  processedItems: number;
  importedShipments: number;
  updatedShipments: number;
  cancelledShipments: number;
  deliveredShipments: number;
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

export interface IShipmentSyncSchedule {
  id: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  direction: SyncDirection;
  scope: SyncScope;
  itemType: ShipmentItemType;
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

export interface NormalizedShipmentItem {
  externalShipmentId: string;
  externalOrderId?: string;
  externalTrackingNumber?: string;
  shipmentDate?: Date;
  status?: string;
  carrier?: string;
  carrierService?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  origin?: {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  destination?: {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  packages?: Array<{
    externalPackageId?: string;
    packageNumber?: number;
    trackingNumber?: string;
    weight?: number;
    weightUnit?: string;
    length?: number;
    width?: number;
    height?: number;
    dimensionUnit?: string;
  }>;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  dispatchDate?: Date;
  totalWeight?: number;
  weightUnit?: string;
  shippingCost?: number;
  currency?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface ShipmentSyncRequest {
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  direction?: SyncDirection;
  scope?: SyncScope;
  itemType?: ShipmentItemType;
  trigger?: SyncTrigger;
  conflictStrategy?: ConflictStrategy;
  filterOptions?: Record<string, unknown>;
  scheduleId?: string;
  correlationId?: string;
  createdBy?: string | null;
}

export interface RetryFailedShipmentItemsRequest {
  jobId: string;
  workspaceId: string;
  itemIds?: string[];
  createdBy?: string | null;
}

export interface ShipmentSyncJobFilter {
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

export interface ShipmentItemSyncResult {
  externalId: string | null;
  internalId?: string | null;
  trackingNumber?: string | null;
  itemType: ShipmentItemType;
  operation: SyncItemOperation;
  status: SyncItemStatus;
  errorCode?: string | null;
  errorMessage?: string | null;
  retryable: boolean;
}

export interface ShipmentSyncAdapter {
  fetchShipments?: (request: {
    providerKey: string;
    accountId: string;
    cursor?: string | null;
    pageSize?: number;
    filterOptions?: Record<string, unknown> | null;
  }) => Promise<{
    shipments: Record<string, unknown>[];
    nextCursor?: string | null;
    totalCount?: number | null;
  }>;

  pushShipment?: (request: {
    providerKey: string;
    accountId: string;
    shipment: NormalizedShipmentItem;
  }) => Promise<{
    success: boolean;
    externalShipmentId?: string;
    errorCode?: string;
    errorMessage?: string;
  }>;

  updateShipment?: (request: {
    providerKey: string;
    accountId: string;
    externalShipmentId: string;
    updates: Partial<NormalizedShipmentItem>;
  }) => Promise<{
    success: boolean;
    errorCode?: string;
    errorMessage?: string;
  }>;

  cancelShipment?: (request: {
    providerKey: string;
    accountId: string;
    externalShipmentId: string;
    reason?: string;
  }) => Promise<{
    success: boolean;
    errorCode?: string;
    errorMessage?: string;
  }>;

  confirmDelivery?: (request: {
    providerKey: string;
    accountId: string;
    externalShipmentId: string;
    deliveryDate: Date;
  }) => Promise<{
    success: boolean;
    errorCode?: string;
    errorMessage?: string;
  }>;
}

export interface ShipmentConflictDetectionResult {
  hasConflict: boolean;
  conflictType?: ShipmentConflictType;
  details?: {
    field: string;
    atlasValue: unknown;
    marketplaceValue: unknown;
  }[];
}

export interface ShipmentSyncEventPayload {
  event: ShipmentSyncEvent;
  jobId: string;
  correlationId: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  direction: SyncDirection;
  scope: SyncScope;
  itemType: ShipmentItemType;
  status?: SyncJobStatus;
  externalShipmentId?: string | null;
  internalShipmentId?: string | null;
  trackingNumber?: string | null;
  conflictType?: ShipmentConflictType | null;
  processedItems?: number;
  totalItems?: number;
  failedItems?: number;
  timestamp: Date;
}
