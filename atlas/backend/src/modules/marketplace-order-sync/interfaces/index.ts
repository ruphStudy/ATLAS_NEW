export enum OrderItemType {
  ALL = 'ALL',
  STANDARD = 'STANDARD',
  BUNDLE = 'BUNDLE',
  DIGITAL = 'DIGITAL',
  SERVICE = 'SERVICE',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  RETURNED = 'RETURNED',
  FAILED = 'FAILED',
}

export enum OrderConflictType {
  STATUS_MISMATCH = 'STATUS_MISMATCH',
  AMOUNT_MISMATCH = 'AMOUNT_MISMATCH',
  ITEM_COUNT_MISMATCH = 'ITEM_COUNT_MISMATCH',
  CUSTOMER_MISMATCH = 'CUSTOMER_MISMATCH',
  DUPLICATE_ORDER = 'DUPLICATE_ORDER',
}

export enum OrderSyncEvent {
  REQUESTED = 'REQUESTED',
  STARTED = 'STARTED',
  COMPLETED = 'COMPLETED',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  CONFLICT_DETECTED = 'CONFLICT_DETECTED',
  ORDER_IMPORTED = 'ORDER_IMPORTED',
  ORDER_UPDATED = 'ORDER_UPDATED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
}

export enum SyncDirection {
  INBOUND = 'INBOUND',
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
  NOOP = 'NOOP',
}

export enum ConflictStrategy {
  MARKETPLACE_WINS = 'MARKETPLACE_WINS',
  ATLAS_WINS = 'ATLAS_WINS',
  NEWEST_WINS = 'NEWEST_WINS',
  SKIP = 'SKIP',
  FLAG = 'FLAG',
}

export interface IOrderSyncJob {
  id: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  direction: SyncDirection;
  scope: SyncScope;
  itemType: OrderItemType;
  trigger: SyncTrigger;
  status: SyncJobStatus;
  conflictStrategy: ConflictStrategy | null;
  filterOptions: Record<string, unknown> | null;
  scheduleId: string | null;
  correlationId: string;
  cursor: string | null;
  totalItems: number | null;
  processedItems: number;
  importedOrders: number;
  updatedOrders: number;
  cancelledOrders: number;
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

export interface IOrderSyncSchedule {
  id: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  direction: SyncDirection;
  scope: SyncScope;
  itemType: OrderItemType;
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

export interface NormalizedOrderItem {
  externalOrderId: string;
  externalOrderNumber?: string;
  orderDate?: Date;
  status?: OrderStatus;
  customer?: {
    externalCustomerId?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  billingAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  shippingAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  items?: Array<{
    externalItemId?: string;
    sku?: string;
    title?: string;
    quantity?: number;
    unitPrice?: number;
    totalPrice?: number;
    tax?: number;
    discount?: number;
  }>;
  subtotal?: number;
  tax?: number;
  discount?: number;
  shipping?: number;
  total?: number;
  currency?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  externalTransactionId?: string;
  shippingMethod?: string;
  trackingNumber?: string;
  notes?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface OrderSyncRequest {
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  direction?: SyncDirection;
  scope?: SyncScope;
  itemType?: OrderItemType;
  trigger?: SyncTrigger;
  conflictStrategy?: ConflictStrategy;
  filterOptions?: Record<string, unknown>;
  scheduleId?: string;
  correlationId?: string;
  createdBy?: string | null;
}

export interface RetryFailedOrderItemsRequest {
  jobId: string;
  workspaceId: string;
  itemIds?: string[];
  createdBy?: string | null;
}

export interface OrderSyncJobFilter {
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

export interface OrderItemSyncResult {
  externalId: string | null;
  internalId?: string | null;
  orderNumber?: string | null;
  itemType: OrderItemType;
  operation: SyncItemOperation;
  status: SyncItemStatus;
  errorCode?: string | null;
  errorMessage?: string | null;
  retryable: boolean;
}

export interface OrderSyncAdapter {
  fetchOrders?: (request: {
    providerKey: string;
    accountId: string;
    cursor?: string | null;
    pageSize?: number;
    filterOptions?: Record<string, unknown> | null;
  }) => Promise<{
    orders: unknown[];
    nextCursor?: string | null;
    totalCount?: number | null;
  }>;
  fetchOrderById?: (request: {
    providerKey: string;
    accountId: string;
    externalOrderId: string;
  }) => Promise<unknown>;
}
