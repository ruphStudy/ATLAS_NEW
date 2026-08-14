// =============================================================
// Multi-Channel Framework – Core Interfaces & Contracts
//
// A thin registration/routing layer over the existing Multi-Marketplace
// Framework, generalized to cover non-marketplace sales channels (D2C
// stores, B2B portals, retail/POS, social commerce). MARKETPLACE-type
// channels reference an existing `MarketplaceAccount` and route through
// the existing `MarketplaceProviderFactoryService`/`MarketplaceErrorNormalizer`
// unchanged; other channel types plug into this module's own lightweight,
// equally provider-independent `ChannelProviderRegistry`. Nothing here
// hardcodes any specific channel's behavior — every channel is data plus
// an adapter registered against a `channelType` + `providerKey`.
// =============================================================

export enum ChannelType {
  MARKETPLACE = 'MARKETPLACE',
  D2C_STORE = 'D2C_STORE',
  B2B_PORTAL = 'B2B_PORTAL',
  RETAIL_POS = 'RETAIL_POS',
  SOCIAL_COMMERCE = 'SOCIAL_COMMERCE',
  CUSTOM = 'CUSTOM',
}

export enum ChannelStatus {
  REGISTERED = 'REGISTERED',
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  ARCHIVED = 'ARCHIVED',
}

export enum ChannelEvent {
  CHANNEL_REGISTERED = 'multi-channel.channel_registered',
  CHANNEL_UPDATED = 'multi-channel.channel_updated',
  CHANNEL_ENABLED = 'multi-channel.channel_enabled',
  CHANNEL_DISABLED = 'multi-channel.channel_disabled',
  CHANNEL_ARCHIVED = 'multi-channel.channel_archived',
  CHANNEL_RESTORED = 'multi-channel.channel_restored',
  DEFAULT_CHANNEL_CHANGED = 'multi-channel.default_channel_changed',
  PRODUCT_MAPPED = 'multi-channel.product_mapped',
  PRODUCT_UNMAPPED = 'multi-channel.product_unmapped',
  CAPABILITY_UNSUPPORTED = 'multi-channel.capability_unsupported',
  OPERATION_DUPLICATE_PREVENTED = 'multi-channel.operation_duplicate_prevented',
  CACHE_INVALIDATED = 'multi-channel.cache_invalidated',
  VALIDATION_FAILED = 'multi-channel.validation_failed',
}

export enum ChannelValidationIssueType {
  INVALID_CHANNEL = 'INVALID_CHANNEL',
  DUPLICATE_CHANNEL_KEY = 'DUPLICATE_CHANNEL_KEY',
  UNKNOWN_MARKETPLACE_ACCOUNT = 'UNKNOWN_MARKETPLACE_ACCOUNT',
  UNKNOWN_BUSINESS = 'UNKNOWN_BUSINESS',
  UNKNOWN_BRAND = 'UNKNOWN_BRAND',
  UNKNOWN_PROVIDER = 'UNKNOWN_PROVIDER',
  INVALID_CROSS_CHANNEL_ASSIGNMENT = 'INVALID_CROSS_CHANNEL_ASSIGNMENT',
}

export enum ChannelHealthState {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
  UNKNOWN = 'UNKNOWN',
}

// ── Core Entity ────────────────────────────────────────────────

export interface IChannel {
  id: string;
  workspaceId: string;
  organizationId?: string | null;
  businessId?: string | null;
  brandId?: string | null;
  channelType: ChannelType;
  channelKey: string;
  providerKey?: string | null;
  marketplaceAccountId?: string | null;
  externalAccountRef?: string | null;
  name: string;
  status: ChannelStatus;
  version: number;
  isDefault: boolean;
  priority: number;
  capabilities: string[];
  routingRules: Record<string, unknown>;
  rateLimitConfig?: Record<string, unknown> | null;
  retryConfig?: Record<string, unknown> | null;
  regionalSettingsProfileKey?: string | null;
  taxJurisdictionCode?: string | null;
  complianceProfileKey?: string | null;
  settings: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IChannelHistory {
  id: string;
  channelId: string;
  version: number;
  status: ChannelStatus;
  snapshot: Record<string, unknown>;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export interface IChannelProductMapping {
  id: string;
  channelId: string;
  workspaceId: string;
  internalProductId: string;
  externalSku?: string | null;
  externalProductId?: string | null;
  externalUrl?: string | null;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IChannelOperationLog {
  id: string;
  channelId: string;
  workspaceId: string;
  operationType: string;
  idempotencyKey: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  resultSnapshot?: Record<string, unknown> | null;
  errorSnapshot?: Record<string, unknown> | null;
  createdAt: Date;
  completedAt?: Date | null;
}

// ── Generic Channel Provider Contract (for non-marketplace channel types) ──
//
// MARKETPLACE-type channels never use this — they route through the
// existing `MarketplaceProviderFactoryService`/`MarketplaceProviderRegistry`.
// This contract exists purely so a future D2C/B2B/retail/social adapter has
// somewhere provider-independent to register itself.

export interface IChannelProviderMetadata {
  providerKey: string;
  providerName: string;
  displayName: string;
  supportedChannelTypes: ChannelType[];
  supportedCapabilities: string[];
}

export interface IChannelHealthResult {
  providerKey: string;
  channelId?: string | null;
  status: ChannelHealthState;
  latencyMs?: number;
  message?: string | null;
  checkedAt: Date;
}

export interface IChannelProviderAdapter {
  readonly metadata: IChannelProviderMetadata;
  supportsCapability(capability: string): boolean;
  supportsChannelType(channelType: ChannelType): boolean;
  healthCheck(channelId?: string): Promise<IChannelHealthResult>;
}

// ── Routing ───────────────────────────────────────────────────

export interface IChannelRoutingContext {
  workspaceId: string;
  businessId?: string | null;
  brandId?: string | null;
  channelType?: ChannelType | null;
  capability?: string | null;
}

// ── Validation ────────────────────────────────────────────────

export interface IChannelValidationIssue {
  type: ChannelValidationIssueType;
  message: string;
}

export interface IChannelValidationResult {
  valid: boolean;
  issues: IChannelValidationIssue[];
  warnings: string[];
}

// ── Filters ───────────────────────────────────────────────────

export interface ChannelFilterOptions {
  workspaceId?: string | null;
  organizationId?: string | null;
  businessId?: string | null;
  brandId?: string | null;
  channelType?: ChannelType | null;
  status?: ChannelStatus | null;
  search?: string | null;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ChannelProductMappingFilterOptions {
  channelId?: string | null;
  workspaceId?: string | null;
  internalProductId?: string | null;
  externalSku?: string | null;
}

// ── Cache ─────────────────────────────────────────────────────

export interface CachedChannelSet {
  channels: IChannel[];
  cachedAt: number;
}

export interface CachedChannel {
  channel: IChannel;
  cachedAt: number;
}

// ── Event Payload ─────────────────────────────────────────────

export interface ChannelEventPayload {
  event: ChannelEvent;
  channelId?: string | null;
  channelKey?: string | null;
  workspaceId?: string | null;
  channelType?: string | null;
  entityId?: string | null;
  changedBy?: string | null;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}
