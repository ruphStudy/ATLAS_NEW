// =============================================================
// Listing Publisher – Interfaces & Types
// =============================================================

export enum PublicationStatus {
  PENDING = 'PENDING',
  PUBLISHING = 'PUBLISHING',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
  UNPUBLISHED = 'UNPUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum PublicationMarketplace {
  AMAZON = 'AMAZON',
  EBAY = 'EBAY',
  SHOPIFY = 'SHOPIFY',
  WALMART = 'WALMART',
  ETSY = 'ETSY',
  CUSTOM = 'CUSTOM',
}

export enum SyncStatus {
  IN_SYNC = 'IN_SYNC',
  OUT_OF_SYNC = 'OUT_OF_SYNC',
  SYNC_FAILED = 'SYNC_FAILED',
  UNKNOWN = 'UNKNOWN',
}

export enum PublicationEvent {
  PUBLISHED = 'publication.published',
  FAILED = 'publication.failed',
  UNPUBLISHED = 'publication.unpublished',
  COMPLETED = 'publication.completed',
}

export enum PublishTrigger {
  MANUAL = 'MANUAL',
  SCHEDULED = 'SCHEDULED',
  BULK = 'BULK',
  REPUBLISH = 'REPUBLISH',
  RETRY = 'RETRY',
}

// ── Marketplace Adapter Response ─────────────────────────────

export interface MarketplacePublishResult {
  success: boolean;
  marketplaceListingId?: string | null;
  marketplaceUrl?: string | null;
  marketplaceResponse?: unknown;
  errorCode?: string | null;
  errorMessage?: string | null;
}

export interface BulkPublishItem {
  listingId: string;
  catalogProductId: string;
  marketplace: PublicationMarketplace;
  scheduledAt?: Date | null;
}

// ── Domain Interfaces ─────────────────────────────────────────

export interface IListingPublication {
  id: string;
  workspaceId: string;
  listingId: string;
  catalogProductId: string;
  marketplace: PublicationMarketplace;
  status: PublicationStatus;
  publicationVersion: number;

  // Marketplace tracking
  marketplaceListingId?: string | null;
  marketplaceUrl?: string | null;
  marketplaceResponse?: unknown;

  // Scheduling
  trigger: PublishTrigger;
  scheduledAt?: Date | null;
  publishedAt?: Date | null;
  unpublishedAt?: Date | null;

  // Sync
  syncStatus: SyncStatus;
  lastSyncedAt?: Date | null;

  // Error
  errorCode?: string | null;
  errorMessage?: string | null;
  failedAt?: Date | null;
  retryCount: number;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IListingPublicationHistory {
  id: string;
  publicationId: string;
  workspaceId: string;
  fromStatus: PublicationStatus;
  toStatus: PublicationStatus;
  publicationVersion: number;
  trigger: PublishTrigger;
  reason?: string | null;
  changedBy?: string | null;
  marketplaceListingId?: string | null;
  errorMessage?: string | null;
  createdAt: Date;
}

// ── Job Payloads ─────────────────────────────────────────────

export interface PublicationEventPayload {
  publicationId: string;
  listingId: string;
  catalogProductId: string;
  workspaceId: string;
  marketplace: PublicationMarketplace;
  event: PublicationEvent;
  triggeredBy?: string;
  metadata?: Record<string, unknown>;
}

export interface PublishJobPayload {
  publicationId: string;
  listingId: string;
  catalogProductId: string;
  workspaceId: string;
  marketplace: PublicationMarketplace;
  trigger: PublishTrigger;
  triggeredBy?: string;
  retryCount?: number;
}

export interface UnpublishJobPayload {
  publicationId: string;
  listingId: string;
  workspaceId: string;
  marketplace: PublicationMarketplace;
  trigger: PublishTrigger;
  triggeredBy?: string;
  reason?: string;
}

export interface BulkPublishJobPayload {
  workspaceId: string;
  items: BulkPublishItem[];
  triggeredBy?: string;
}
