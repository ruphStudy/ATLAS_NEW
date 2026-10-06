export enum PriceItemType {
  ALL = 'ALL',
  BASE = 'BASE',
  SALE = 'SALE',
  LIST = 'LIST',
  PROMOTION = 'PROMOTION',
  SCHEDULED = 'SCHEDULED',
}

export enum PriceSyncEvent {
  SYNC_STARTED = 'SYNC_STARTED',
  SYNC_COMPLETED = 'SYNC_COMPLETED',
  SYNC_FAILED = 'SYNC_FAILED',
  SYNC_CANCELLED = 'SYNC_CANCELLED',
  PRICE_IMPORTED = 'PRICE_IMPORTED',
  PRICE_UPDATED = 'PRICE_UPDATED',
  PRICE_EXPORTED = 'PRICE_EXPORTED',
  PRICE_PUSHED = 'PRICE_PUSHED',
  PRICE_CONFLICT_DETECTED = 'PRICE_CONFLICT_DETECTED',
  PRICE_CONFLICT_RESOLVED = 'PRICE_CONFLICT_RESOLVED',
  PRICE_VALIDATION_FAILED = 'PRICE_VALIDATION_FAILED',
  PRICE_SYNC_SKIPPED = 'PRICE_SYNC_SKIPPED',
  PROMOTION_STARTED = 'PROMOTION_STARTED',
  PROMOTION_ENDED = 'PROMOTION_ENDED',
  SCHEDULED_PRICE_ACTIVATED = 'SCHEDULED_PRICE_ACTIVATED',
  SCHEDULED_PRICE_EXPIRED = 'SCHEDULED_PRICE_EXPIRED',
  BULK_PRICE_UPDATE = 'BULK_PRICE_UPDATE',
  PRICE_RULE_APPLIED = 'PRICE_RULE_APPLIED',
  PRICE_PROTECTED = 'PRICE_PROTECTED',
}

export enum SyncDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
  BIDIRECTIONAL = 'BIDIRECTIONAL',
}

export enum SyncMode {
  FULL = 'FULL',
  INCREMENTAL = 'INCREMENTAL',
  MANUAL = 'MANUAL',
}

export enum SyncStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  PARTIAL = 'PARTIAL',
}

export enum ConflictResolutionStrategy {
  MARKETPLACE_WINS = 'MARKETPLACE_WINS',
  ATLAS_WINS = 'ATLAS_WINS',
  NEWEST_WINS = 'NEWEST_WINS',
  HIGHEST_PRICE_WINS = 'HIGHEST_PRICE_WINS',
  LOWEST_PRICE_WINS = 'LOWEST_PRICE_WINS',
  SKIP = 'SKIP',
  FLAG = 'FLAG',
}

export enum ItemSyncStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
  CONFLICT = 'CONFLICT',
}

export interface IPriceSyncJob {
  id: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  direction: SyncDirection;
  mode: SyncMode;
  status: SyncStatus;
  itemType: PriceItemType;
  startedAt?: Date;
  completedAt?: Date;
  totalItems: number;
  processedItems: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  conflictCount: number;
  cursor?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface NormalizedPriceItem {
  externalPriceId: string;
  externalOfferId?: string;
  sku: string;
  variantId?: string;
  marketplaceId?: string;
  countryCode?: string;
  currency: string;
  basePrice?: number;
  salePrice?: number;
  listPrice?: number;
  tax?: {
    rate?: number;
    amount?: number;
    inclusive?: boolean;
  };
  fees?: Array<{
    type: string;
    amount: number;
    percentage?: number;
  }>;
  promotion?: {
    id?: string;
    type?: string;
    discountAmount?: number;
    discountPercentage?: number;
    startDate?: Date;
    endDate?: Date;
  };
  effectiveFrom?: Date;
  effectiveTo?: Date;
  minQuantity?: number;
  maxQuantity?: number;
  isActive: boolean;
  isProtected?: boolean;
  lastUpdatedAt: Date;
  rawData: Record<string, any>;
}

export interface PriceSyncResult {
  success: boolean;
  itemsProcessed: number;
  itemsImported: number;
  itemsUpdated: number;
  itemsSkipped: number;
  itemsFailed: number;
  conflicts: number;
  nextCursor?: string;
  hasMore: boolean;
  errors: Array<{
    externalPriceId: string;
    sku?: string;
    error: string;
  }>;
}

export interface PriceSyncAdapter {
  fetchPrices(params: {
    accountId: string;
    lastSyncTime?: Date;
    cursor?: string;
    itemType?: PriceItemType;
    limit?: number;
  }): Promise<{
    items: NormalizedPriceItem[];
    nextCursor?: string;
    hasMore: boolean;
  }>;

  pushPrice(params: {
    accountId: string;
    price: NormalizedPriceItem;
  }): Promise<{
    success: boolean;
    externalPriceId: string;
    externalOfferId?: string;
    error?: string;
  }>;

  updatePrice(params: {
    accountId: string;
    externalPriceId: string;
    price: Partial<NormalizedPriceItem>;
  }): Promise<{
    success: boolean;
    error?: string;
  }>;

  deletePrice(params: {
    accountId: string;
    externalPriceId: string;
  }): Promise<{
    success: boolean;
    error?: string;
  }>;

  activatePromotion(params: {
    accountId: string;
    externalPriceId: string;
    promotion: NormalizedPriceItem['promotion'];
  }): Promise<{
    success: boolean;
    error?: string;
  }>;

  deactivatePromotion(params: {
    accountId: string;
    externalPriceId: string;
  }): Promise<{
    success: boolean;
    error?: string;
  }>;

  schedulePrice(params: {
    accountId: string;
    externalPriceId: string;
    price: Partial<NormalizedPriceItem>;
    effectiveFrom: Date;
    effectiveTo?: Date;
  }): Promise<{
    success: boolean;
    error?: string;
  }>;
}

export interface PriceSyncConfig {
  workspaceId: string;
  accountId: string;
  direction: SyncDirection;
  mode: SyncMode;
  itemType: PriceItemType;
  conflictStrategy: ConflictResolutionStrategy;
  batchSize?: number;
  enableRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export interface PriceSyncMetadata {
  totalPages?: number;
  currentPage?: number;
  itemsPerPage?: number;
  filters?: Record<string, any>;
  triggerSource?: string;
  triggeredBy?: string;
  notes?: string;
}
