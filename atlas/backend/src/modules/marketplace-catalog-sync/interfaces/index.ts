// =============================================================
// Marketplace Catalog Synchronization – Core Interfaces & Enums
// =============================================================

// ── Sync Direction ────────────────────────────────────────────

export enum SyncDirection {
  INBOUND = 'INBOUND',         // Marketplace → ATLAS
  OUTBOUND = 'OUTBOUND',       // ATLAS → Marketplace
  BIDIRECTIONAL = 'BIDIRECTIONAL',
}

// ── Sync Scope ────────────────────────────────────────────────

export enum SyncScope {
  FULL = 'FULL',               // All items
  INCREMENTAL = 'INCREMENTAL', // Changes since last sync
  DELTA = 'DELTA',             // Explicit item set
  RETRY = 'RETRY',             // Re-process previously failed items
}

// ── Item Type ─────────────────────────────────────────────────

export enum SyncItemType {
  LISTING = 'LISTING',
  INVENTORY = 'INVENTORY',
  PRICING = 'PRICING',
  CATALOG_ATTRIBUTE = 'CATALOG_ATTRIBUTE',
  CATEGORY = 'CATEGORY',
  VARIANT = 'VARIANT',
  IMAGE = 'IMAGE',
  ORDER = 'ORDER',
  ALL = 'ALL',
}

// ── Sync Trigger ──────────────────────────────────────────────

export enum SyncTrigger {
  MANUAL = 'MANUAL',
  SCHEDULED = 'SCHEDULED',
  WEBHOOK = 'WEBHOOK',
  SYSTEM = 'SYSTEM',
}

// ── Job Status ────────────────────────────────────────────────

export enum SyncJobStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  PAUSED = 'PAUSED',
  // Legacy aliases kept for backwards compat
  RUNNING = 'PROCESSING',
}

// ── Item Sync Status ──────────────────────────────────────────

export enum SyncItemStatus {
  SYNCED = 'SYNCED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
  CONFLICT = 'CONFLICT',
}

// ── Item Operation ────────────────────────────────────────────

export enum SyncItemOperation {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  NOOP = 'NOOP',
}

// ── Conflict Strategy ─────────────────────────────────────────

export enum ConflictStrategy {
  MARKETPLACE_WINS = 'MARKETPLACE_WINS',
  ATLAS_WINS = 'ATLAS_WINS',
  NEWEST_WINS = 'NEWEST_WINS',
  SKIP = 'SKIP',
  FLAG = 'FLAG',
}

// ── Conflict Type ─────────────────────────────────────────────

export enum SyncConflictType {
  DUPLICATE_SKU = 'DUPLICATE_SKU',
  PRICE_MISMATCH = 'PRICE_MISMATCH',
  INVENTORY_MISMATCH = 'INVENTORY_MISMATCH',
  ATTRIBUTE_CONFLICT = 'ATTRIBUTE_CONFLICT',
  LISTING_STATUS_CONFLICT = 'LISTING_STATUS_CONFLICT',
  UNKNOWN = 'UNKNOWN',
}

// ── Sync Events ───────────────────────────────────────────────

export enum CatalogSyncEvent {
  REQUESTED = 'marketplace-catalog-sync-requested',
  STARTED = 'marketplace-catalog-sync-started',
  COMPLETED = 'marketplace-catalog-sync-completed',
  FAILED = 'marketplace-catalog-sync-failed',
  PARTIAL = 'marketplace-catalog-sync-partial',
  CANCELLED = 'marketplace-catalog-sync-cancelled',
  ITEM_SYNCED = 'marketplace-catalog-item-synced',
  ITEM_FAILED = 'marketplace-catalog-item-failed',
  CONFLICT_DETECTED = 'marketplace-catalog-conflict-detected',
  SCHEDULED = 'marketplace-catalog-sync-scheduled',
  PROGRESS = 'marketplace-catalog-sync-progress',
}

// ── Core Sync Job ─────────────────────────────────────────────

export interface ICatalogSyncJob {
  id: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  direction: SyncDirection;
  scope: SyncScope;
  itemType: SyncItemType;
  trigger: SyncTrigger;
  status: SyncJobStatus;
  scheduledAt?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  cursor?: string | null;
  totalItems: number;
  processedItems: number;
  createdItems: number;
  updatedItems: number;
  deletedItems: number;
  failedItems: number;
  conflictItems: number;
  skippedItems: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  conflictStrategy?: ConflictStrategy | null;
  filterOptions?: SyncFilterOptions | null;
  metadata?: Record<string, unknown> | null;
  scheduleId?: string | null;
  correlationId: string;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// ── Item Sync Result ──────────────────────────────────────────

export interface ICatalogSyncItemResult {
  id: string;
  jobId: string;
  workspaceId: string;
  externalId: string;
  internalId?: string | null;
  itemType: SyncItemType;
  operation: SyncItemOperation;
  status: SyncItemStatus;
  conflictType?: SyncConflictType | null;
  conflictResolution?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  retryable: boolean;
  processingMs?: number | null;
  snapshot?: Record<string, unknown> | null;
  createdAt: Date;
}

// ── Sync Schedule ─────────────────────────────────────────────

export interface ICatalogSyncSchedule {
  id: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  direction: SyncDirection;
  scope: SyncScope;
  itemType: SyncItemType;
  conflictStrategy: ConflictStrategy;
  intervalMs: number;
  enabled: boolean;
  lastRunAt?: Date | null;
  nextRunAt?: Date | null;
  lastJobId?: string | null;
  filterOptions?: SyncFilterOptions | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// ── Filter Options ────────────────────────────────────────────

export interface SyncFilterOptions {
  skus?: string[];
  categories?: string[];
  brands?: string[];
  modifiedSince?: Date | null;
  statusFilter?: string[];
  countryCode?: string | null;
}

// ── Sync Request ──────────────────────────────────────────────

export interface CatalogSyncRequest {
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  direction?: SyncDirection;
  scope?: SyncScope;
  itemType?: SyncItemType;
  trigger?: SyncTrigger;
  conflictStrategy?: ConflictStrategy;
  filterOptions?: SyncFilterOptions | null;
  correlationId?: string | null;
  scheduleId?: string | null;
  createdBy?: string | null;
}

// ── Adapter Page ──────────────────────────────────────────────

export interface SyncAdapterPage {
  items: SyncAdapterItem[];
  nextCursor?: string | null;
  totalCount?: number | null;
}

export interface SyncAdapterItem {
  externalId: string;
  itemType: SyncItemType;
  data: Record<string, unknown>;
  updatedAt?: Date | null;
  checksum?: string | null;
}

// ── Progress Snapshot ─────────────────────────────────────────

export interface SyncProgressSnapshot {
  jobId: string;
  status: SyncJobStatus;
  processedItems: number;
  totalItems: number;
  failedItems: number;
  conflictItems: number;
  cursor?: string | null;
  updatedAt: Date;
}

// ── Event Payload ─────────────────────────────────────────────

export interface CatalogSyncEventPayload {
  event: CatalogSyncEvent;
  jobId: string;
  correlationId: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  direction: SyncDirection;
  scope: SyncScope;
  itemType: SyncItemType;
  status?: SyncJobStatus;
  processedItems?: number;
  totalItems?: number;
  failedItems?: number;
  errorCode?: string | null;
  timestamp: Date;
}

// ── Job Filter ────────────────────────────────────────────────

export interface SyncJobFilter {
  workspaceId: string;
  accountId?: string | null;
  providerKey?: string | null;
  marketplaceKey?: string | null;
  status?: SyncJobStatus | null;
  direction?: SyncDirection | null;
  trigger?: SyncTrigger | null;
  fromDate?: Date | null;
  toDate?: Date | null;
  page?: number;
  limit?: number;
}

// ── Validation Result ─────────────────────────────────────────

export interface SyncValidationResult {
  valid: boolean;
  errors: string[];
}

// ── Metrics ───────────────────────────────────────────────────

export interface SyncMetricsSnapshot {
  workspaceId: string;
  accountId: string;
  providerKey: string;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  partialJobs: number;
  totalItemsSynced: number;
  totalItemsFailed: number;
  totalConflicts: number;
  avgDurationMs: number;
  lastSyncAt?: Date | null;
  lastSyncStatus?: SyncJobStatus | null;
}

// ── External Ref ──────────────────────────────────────────────

export enum ExternalRefType {
  PRODUCT = 'PRODUCT',
  LISTING = 'LISTING',
  CATEGORY = 'CATEGORY',
  SKU = 'SKU',
  VARIANT = 'VARIANT',
  IMAGE = 'IMAGE',
}

export enum ExternalRefStatus {
  ACTIVE = 'ACTIVE',
  STALE = 'STALE',
  DELETED = 'DELETED',
  CONFLICTED = 'CONFLICTED',
}

export interface IExternalRef {
  id: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  refType: ExternalRefType;
  externalId: string;
  externalSku?: string | null;
  externalTitle?: string | null;
  externalUrl?: string | null;
  internalId?: string | null;
  internalSku?: string | null;
  internalType?: string | null;
  status: ExternalRefStatus;
  lastSyncedAt?: Date | null;
  lastJobId?: string | null;
  checksum?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// ── Conflict History ──────────────────────────────────────────

export interface ICatalogSyncConflict {
  id: string;
  jobId: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  externalId: string;
  internalId?: string | null;
  conflictType: SyncConflictType;
  strategy: ConflictStrategy;
  resolution?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: Date | null;
  atlasSnapshot?: Record<string, unknown> | null;
  marketplaceSnapshot?: Record<string, unknown> | null;
  resolvedSnapshot?: Record<string, unknown> | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Normalized Catalog Item ───────────────────────────────────

export interface NormalizedCatalogItem {
  externalId: string;
  externalSku?: string | null;
  itemType: SyncItemType;
  title?: string | null;
  description?: string | null;
  categories?: string[];
  attributes?: Record<string, unknown>;
  variants?: NormalizedVariant[];
  images?: NormalizedImage[];
  price?: number | null;
  currency?: string | null;
  inventory?: number | null;
  listingStatus?: string | null;
  updatedAt?: Date | null;
  checksum?: string | null;
  raw: Record<string, unknown>;
}

export interface NormalizedVariant {
  externalId: string;
  sku?: string | null;
  attributes?: Record<string, unknown>;
  price?: number | null;
  inventory?: number | null;
}

export interface NormalizedImage {
  url: string;
  position?: number;
  altText?: string | null;
}

// ── Import / Export Result ────────────────────────────────────

export interface ImportItemResult {
  externalId: string;
  internalId?: string | null;
  itemType: SyncItemType;
  operation: SyncItemOperation;
  status: SyncItemStatus;
  conflictType?: SyncConflictType | null;
  conflictResolution?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  retryable: boolean;
  processingMs?: number | null;
}

export interface ExportItemResult {
  internalId: string;
  externalId?: string | null;
  itemType: SyncItemType;
  operation: SyncItemOperation;
  status: SyncItemStatus;
  errorCode?: string | null;
  errorMessage?: string | null;
  retryable: boolean;
  processingMs?: number | null;
}

// ── Retry Request ─────────────────────────────────────────────

export interface RetryFailedItemsRequest {
  jobId: string;
  workspaceId: string;
  itemIds?: string[];
  createdBy?: string | null;
}

