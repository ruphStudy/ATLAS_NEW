// =============================================================
// Marketplace Inventory Synchronization – Core Interfaces & Enums
// =============================================================

import { SyncDirection, SyncScope, SyncTrigger, SyncJobStatus, SyncItemStatus, SyncItemOperation, ConflictStrategy } from '../../marketplace-catalog-sync/interfaces';

// Re-export shared enums for convenience
export { SyncDirection, SyncScope, SyncTrigger, SyncJobStatus, SyncItemStatus, SyncItemOperation, ConflictStrategy };

// ── Inventory Item Type ───────────────────────────────────────

export enum InventoryItemType {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  INCOMING = 'INCOMING',
  SAFETY_STOCK = 'SAFETY_STOCK',
  ADJUSTMENT = 'ADJUSTMENT',
  RESERVATION = 'RESERVATION',
  RECONCILIATION = 'RECONCILIATION',
  ALL = 'ALL',
}

// ── Inventory Conflict Type ───────────────────────────────────

export enum InventoryConflictType {
  QUANTITY_MISMATCH = 'QUANTITY_MISMATCH',
  WAREHOUSE_NOT_FOUND = 'WAREHOUSE_NOT_FOUND',
  SKU_NOT_FOUND = 'SKU_NOT_FOUND',
  NEGATIVE_INVENTORY = 'NEGATIVE_INVENTORY',
  RESERVATION_CONFLICT = 'RESERVATION_CONFLICT',
  ADJUSTMENT_CONFLICT = 'ADJUSTMENT_CONFLICT',
  UNKNOWN = 'UNKNOWN',
}

// ── Inventory Adjustment Type ─────────────────────────────────

export enum InventoryAdjustmentType {
  RECEIVED = 'RECEIVED',
  SOLD = 'SOLD',
  RETURNED = 'RETURNED',
  DAMAGED = 'DAMAGED',
  LOST = 'LOST',
  CORRECTION = 'CORRECTION',
  RESERVATION = 'RESERVATION',
  RESERVATION_CANCEL = 'RESERVATION_CANCEL',
  TRANSFER = 'TRANSFER',
}

// ── Inventory Sync Event ──────────────────────────────────────

export enum InventorySyncEvent {
  REQUESTED = 'marketplace-inventory-sync-requested',
  STARTED = 'marketplace-inventory-sync-started',
  COMPLETED = 'marketplace-inventory-sync-completed',
  FAILED = 'marketplace-inventory-sync-failed',
  PARTIAL = 'marketplace-inventory-sync-partial',
  CANCELLED = 'marketplace-inventory-sync-cancelled',
  PROGRESS = 'marketplace-inventory-sync-progress',
  ITEM_SYNCED = 'marketplace-inventory-item-synced',
  ITEM_FAILED = 'marketplace-inventory-item-failed',
  CONFLICT_DETECTED = 'marketplace-inventory-conflict-detected',
  ADJUSTMENT_APPLIED = 'marketplace-inventory-adjustment-applied',
  RECONCILIATION_STARTED = 'marketplace-inventory-reconciliation-started',
  RECONCILIATION_COMPLETED = 'marketplace-inventory-reconciliation-completed',
  SCHEDULED = 'marketplace-inventory-sync-scheduled',
}

// ── Adjustment Status ─────────────────────────────────────────

export enum AdjustmentStatus {
  PENDING = 'PENDING',
  APPLIED = 'APPLIED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

// ── Core Sync Job ─────────────────────────────────────────────

export interface IInventorySyncJob {
  id: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  warehouseId?: string | null;
  direction: SyncDirection;
  scope: SyncScope;
  itemType: InventoryItemType;
  trigger: SyncTrigger;
  status: SyncJobStatus;
  scheduledAt?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  cursor?: string | null;
  totalItems: number;
  processedItems: number;
  pushedItems: number;
  pulledItems: number;
  adjustedItems: number;
  reconciledItems: number;
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

export interface IInventorySyncSchedule {
  id: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  warehouseId?: string | null;
  direction: SyncDirection;
  scope: SyncScope;
  itemType: InventoryItemType;
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

// ── Normalized Inventory Item ─────────────────────────────────

export interface NormalizedInventoryItem {
  externalId: string;
  externalSku?: string | null;
  internalId?: string | null;
  internalSku?: string | null;
  warehouseId?: string | null;
  itemType: InventoryItemType;
  available: number;
  reserved: number;
  incoming: number;
  safetyStock: number;
  updatedAt?: Date | null;
  checksum?: string | null;
  raw: Record<string, unknown>;
}

// ── Normalized Adjustment ─────────────────────────────────────

export interface NormalizedAdjustment {
  externalId?: string | null;
  internalId?: string | null;
  sku?: string | null;
  warehouseId?: string | null;
  adjustmentType: InventoryAdjustmentType;
  quantity: number;
  reason?: string | null;
  notes?: string | null;
  appliedAt?: Date | null;
  raw: Record<string, unknown>;
}

// ── Sync Request ──────────────────────────────────────────────

export interface InventorySyncRequest {
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  warehouseId?: string | null;
  direction?: SyncDirection;
  scope?: SyncScope;
  itemType?: InventoryItemType;
  trigger?: SyncTrigger;
  conflictStrategy?: ConflictStrategy;
  filterOptions?: Record<string, unknown> | null;
  scheduleId?: string | null;
  correlationId?: string | null;
  createdBy?: string | null;
}

// ── Item Sync Result ──────────────────────────────────────────

export interface InventoryItemSyncResult {
  externalId?: string | null;
  internalId?: string | null;
  sku?: string | null;
  itemType: InventoryItemType;
  operation: SyncItemOperation;
  status: SyncItemStatus;
  conflictType?: InventoryConflictType | null;
  conflictResolution?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  retryable: boolean;
  processingMs?: number | null;
}

// ── Retry Request ─────────────────────────────────────────────

export interface RetryFailedInventoryItemsRequest {
  jobId: string;
  workspaceId: string;
  itemIds?: string[];
  createdBy?: string | null;
}

// ── Event Payload ─────────────────────────────────────────────

export interface InventorySyncEventPayload {
  event: InventorySyncEvent;
  jobId: string;
  correlationId: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  warehouseId?: string | null;
  direction: SyncDirection;
  scope: SyncScope;
  itemType: InventoryItemType;
  status?: SyncJobStatus;
  processedItems?: number;
  totalItems?: number;
  failedItems?: number;
  errorCode?: string | null;
  timestamp: Date;
}

// ── Job Filter ────────────────────────────────────────────────

export interface InventorySyncJobFilter {
  workspaceId: string;
  accountId?: string | null;
  providerKey?: string | null;
  marketplaceKey?: string | null;
  warehouseId?: string | null;
  status?: SyncJobStatus | null;
  direction?: SyncDirection | null;
  trigger?: SyncTrigger | null;
  fromDate?: Date | null;
  toDate?: Date | null;
  page?: number;
  limit?: number;
}

// ── Validation Result ─────────────────────────────────────────

export interface InventorySyncValidationResult {
  valid: boolean;
  errors: string[];
}

// ── Metrics Snapshot ──────────────────────────────────────────

export interface InventorySyncMetricsSnapshot {
  workspaceId: string;
  accountId: string;
  providerKey: string;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  partialJobs: number;
  totalItemsSynced: number;
  totalItemsFailed: number;
  totalAdjustments: number;
  totalConflicts: number;
  avgDurationMs: number;
  lastSyncAt?: Date | null;
  lastSyncStatus?: SyncJobStatus | null;
}

// ── External Inventory Ref ────────────────────────────────────

export interface IInventoryExternalRef {
  id: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  warehouseId?: string | null;
  externalId: string;
  externalSku?: string | null;
  internalId?: string | null;
  internalSku?: string | null;
  status: string;
  available: number;
  reserved: number;
  incoming: number;
  safetyStock: number;
  lastSyncedAt?: Date | null;
  lastJobId?: string | null;
  checksum?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// ── Adjustment Record ─────────────────────────────────────────

export interface IInventoryAdjustment {
  id: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  warehouseId?: string | null;
  jobId?: string | null;
  externalId?: string | null;
  internalId?: string | null;
  sku?: string | null;
  adjustmentType: InventoryAdjustmentType;
  quantity: number;
  reason?: string | null;
  notes?: string | null;
  appliedAt?: Date | null;
  status: AdjustmentStatus;
  errorCode?: string | null;
  errorMessage?: string | null;
  snapshot?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Adapter Interface (subset used by inventory sync) ─────────

export interface InventorySyncAdapter {
  fetchInventoryPage: (opts: {
    providerKey: string;
    accountId: string;
    warehouseId?: string | null;
    itemType: InventoryItemType;
    cursor?: string | null;
    filterOptions?: Record<string, unknown> | null;
    pageSize: number;
  }) => Promise<{
    items: InventoryAdapterItem[];
    nextCursor?: string | null;
    totalCount?: number | null;
  }>;
  pushInventoryItem?: (opts: {
    providerKey: string;
    accountId: string;
    warehouseId?: string | null;
    item: Record<string, unknown>;
  }) => Promise<{ externalId: string; success: boolean; errorMessage?: string | null }>;
  fetchAdjustments?: (opts: {
    providerKey: string;
    accountId: string;
    warehouseId?: string | null;
    since?: Date | null;
    cursor?: string | null;
    pageSize: number;
  }) => Promise<{ items: AdjustmentAdapterItem[]; nextCursor?: string | null }>;
}

export interface InventoryAdapterItem {
  externalId: string;
  externalSku?: string | null;
  data: Record<string, unknown>;
  updatedAt?: Date | null;
  checksum?: string | null;
}

export interface AdjustmentAdapterItem {
  externalId?: string | null;
  sku?: string | null;
  data: Record<string, unknown>;
}
