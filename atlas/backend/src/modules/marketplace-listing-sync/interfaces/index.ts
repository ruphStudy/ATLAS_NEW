// =============================================================
// Marketplace Listing Synchronization – Core Interfaces & Enums
// =============================================================

import { SyncDirection, SyncScope, SyncTrigger, SyncJobStatus, SyncItemStatus, SyncItemOperation, ConflictStrategy } from '../../marketplace-catalog-sync/interfaces';

// Re-export shared enums for convenience
export { SyncDirection, SyncScope, SyncTrigger, SyncJobStatus, SyncItemStatus, SyncItemOperation, ConflictStrategy };

// ── Listing Item Type ─────────────────────────────────────────

export enum ListingItemType {
  LISTING = 'LISTING',
  VARIANT = 'VARIANT',
  MEDIA = 'MEDIA',
  CATEGORY = 'CATEGORY',
  ATTRIBUTE = 'ATTRIBUTE',
  PRICE = 'PRICE',
  STATUS = 'STATUS',
  ALL = 'ALL',
}

// ── Listing Status ────────────────────────────────────────────

export enum ListingStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PAUSED = 'PAUSED',
  PENDING = 'PENDING',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
}

// ── Listing Conflict Type ─────────────────────────────────────

export enum ListingConflictType {
  TITLE_MISMATCH = 'TITLE_MISMATCH',
  DESCRIPTION_MISMATCH = 'DESCRIPTION_MISMATCH',
  PRICE_MISMATCH = 'PRICE_MISMATCH',
  STATUS_MISMATCH = 'STATUS_MISMATCH',
  CATEGORY_MISMATCH = 'CATEGORY_MISMATCH',
  ATTRIBUTE_MISMATCH = 'ATTRIBUTE_MISMATCH',
  VARIANT_MISMATCH = 'VARIANT_MISMATCH',
  MEDIA_MISMATCH = 'MEDIA_MISMATCH',
  SKU_NOT_FOUND = 'SKU_NOT_FOUND',
  MAPPING_FAILED = 'MAPPING_FAILED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  UNKNOWN = 'UNKNOWN',
}

// ── Listing Sync Event ────────────────────────────────────────

export enum ListingSyncEvent {
  REQUESTED = 'marketplace-listing-sync-requested',
  STARTED = 'marketplace-listing-sync-started',
  COMPLETED = 'marketplace-listing-sync-completed',
  FAILED = 'marketplace-listing-sync-failed',
  PARTIAL = 'marketplace-listing-sync-partial',
  CANCELLED = 'marketplace-listing-sync-cancelled',
  PROGRESS = 'marketplace-listing-sync-progress',
  ITEM_SYNCED = 'marketplace-listing-item-synced',
  ITEM_FAILED = 'marketplace-listing-item-failed',
  CONFLICT_DETECTED = 'marketplace-listing-conflict-detected',
  SCHEDULED = 'marketplace-listing-sync-scheduled',
  LISTING_CREATED = 'marketplace-listing-created',
  LISTING_UPDATED = 'marketplace-listing-updated',
  LISTING_PAUSED = 'marketplace-listing-paused',
  LISTING_ACTIVATED = 'marketplace-listing-activated',
  LISTING_DELETED = 'marketplace-listing-deleted',
}

// ── Core Sync Job ─────────────────────────────────────────────

export interface IListingSyncJob {
  id: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  direction: SyncDirection;
  scope: SyncScope;
  itemType: ListingItemType;
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
  pausedItems: number;
  activatedItems: number;
  deletedItems: number;
  failedItems: number;
  conflictItems: number;
  skippedItems: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  conflictStrategy?: ConflictStrategy | null;
  filterOptions?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  scheduleId?: string | null;
  correlationId: string;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// ── Schedule ──────────────────────────────────────────────────

export interface IListingSyncSchedule {
  id: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  direction: SyncDirection;
  scope: SyncScope;
  itemType: ListingItemType;
  conflictStrategy?: ConflictStrategy | null;
  intervalMs: number;
  enabled: boolean;
  lastRunAt?: Date | null;
  nextRunAt?: Date | null;
  lastJobId?: string | null;
  filterOptions?: Record<string, unknown> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// ── Normalized Listing Item ───────────────────────────────────

export interface NormalizedListingItem {
  externalId: string;
  externalSku?: string | null;
  internalId?: string | null;
  internalSku?: string | null;
  itemType: ListingItemType;
  title?: string | null;
  description?: string | null;
  bulletPoints?: string[];
  category?: string | null;
  attributes?: Record<string, unknown>;
  variants?: NormalizedVariant[];
  media?: NormalizedMedia[];
  price?: number | null;
  currency?: string | null;
  status?: ListingStatus | null;
  updatedAt?: Date | null;
  checksum?: string | null;
  raw: Record<string, unknown>;
}

export interface NormalizedVariant {
  externalId: string;
  sku?: string | null;
  attributes?: Record<string, unknown>;
  price?: number | null;
  media?: NormalizedMedia[];
}

export interface NormalizedMedia {
  url: string;
  type: string;
  position?: number;
  altText?: string | null;
}

// ── Sync Request ──────────────────────────────────────────────

export interface ListingSyncRequest {
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  direction?: SyncDirection;
  scope?: SyncScope;
  itemType?: ListingItemType;
  trigger?: SyncTrigger;
  conflictStrategy?: ConflictStrategy;
  filterOptions?: Record<string, unknown> | null;
  scheduleId?: string | null;
  correlationId?: string | null;
  createdBy?: string | null;
}

// ── Item Sync Result ──────────────────────────────────────────

export interface ListingItemSyncResult {
  externalId?: string | null;
  internalId?: string | null;
  sku?: string | null;
  itemType: ListingItemType;
  operation: SyncItemOperation;
  status: SyncItemStatus;
  conflictType?: ListingConflictType | null;
  conflictResolution?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  retryable: boolean;
  processingMs?: number | null;
}

// ── Retry Request ─────────────────────────────────────────────

export interface RetryFailedListingItemsRequest {
  jobId: string;
  workspaceId: string;
  itemIds?: string[];
  createdBy?: string | null;
}

// ── Event Payload ─────────────────────────────────────────────

export interface ListingSyncEventPayload {
  event: ListingSyncEvent;
  jobId: string;
  correlationId: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  direction: SyncDirection;
  scope: SyncScope;
  itemType: ListingItemType;
  status?: SyncJobStatus;
  processedItems?: number;
  totalItems?: number;
  failedItems?: number;
  errorCode?: string | null;
  timestamp: Date;
}

// ── Job Filter ────────────────────────────────────────────────

export interface ListingSyncJobFilter {
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

export interface ListingSyncValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ── Metrics Snapshot ──────────────────────────────────────────

export interface ListingSyncMetricsSnapshot {
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

// ── External Listing Ref ──────────────────────────────────────

export enum ExternalListingRefStatus {
  ACTIVE = 'ACTIVE',
  STALE = 'STALE',
  DELETED = 'DELETED',
  CONFLICTED = 'CONFLICTED',
}

export interface IListingExternalRef {
  id: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  externalId: string;
  externalSku?: string | null;
  externalTitle?: string | null;
  internalId?: string | null;
  internalSku?: string | null;
  status: ExternalListingRefStatus;
  listingStatus?: ListingStatus | null;
  lastSyncedAt?: Date | null;
  lastJobId?: string | null;
  checksum?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// ── Conflict Record ───────────────────────────────────────────

export interface IListingSyncConflict {
  id: string;
  jobId: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  externalId: string;
  internalId?: string | null;
  conflictType: ListingConflictType;
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

// ── Adapter Interface ─────────────────────────────────────────

export interface ListingSyncAdapter {
  fetchListingPage: (opts: {
    providerKey: string;
    accountId: string;
    itemType: ListingItemType;
    cursor?: string | null;
    filterOptions?: Record<string, unknown> | null;
    pageSize: number;
  }) => Promise<{
    items: ListingAdapterItem[];
    nextCursor?: string | null;
    totalCount?: number | null;
  }>;
  pushListingItem?: (opts: {
    providerKey: string;
    accountId: string;
    item: Record<string, unknown>;
  }) => Promise<{ externalId: string; success: boolean; errorMessage?: string | null }>;
  updateListingStatus?: (opts: {
    providerKey: string;
    accountId: string;
    externalId: string;
    status: ListingStatus;
  }) => Promise<{ success: boolean; errorMessage?: string | null }>;
  deleteListing?: (opts: {
    providerKey: string;
    accountId: string;
    externalId: string;
  }) => Promise<{ success: boolean; errorMessage?: string | null }>;
}

export interface ListingAdapterItem {
  externalId: string;
  externalSku?: string | null;
  data: Record<string, unknown>;
  updatedAt?: Date | null;
  checksum?: string | null;
}
