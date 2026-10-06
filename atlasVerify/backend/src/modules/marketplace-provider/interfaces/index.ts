// =============================================================
// Marketplace Provider Foundation – Core Interfaces & Contracts
// =============================================================

// ── Provider Identity ─────────────────────────────────────────

/**
 * Well-known marketplace keys used as stable identifiers.
 * External adapters register themselves against these keys.
 * Add new keys without changing existing business logic.
 */
export enum MarketplaceKey {
  AMAZON = 'AMAZON',
  FLIPKART = 'FLIPKART',
  SHOPIFY = 'SHOPIFY',
  WALMART = 'WALMART',
  EBAY = 'EBAY',
  MEESHO = 'MEESHO',
  CUSTOM = 'CUSTOM',
}

export enum MarketplaceProviderStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DEGRADED = 'DEGRADED',
  MAINTENANCE = 'MAINTENANCE',
  DEPRECATED = 'DEPRECATED',
  PENDING_SETUP = 'PENDING_SETUP',
}

export enum MarketplaceAccountStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  CREDENTIAL_EXPIRED = 'CREDENTIAL_EXPIRED',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

// ── Capabilities ─────────────────────────────────────────────

export enum MarketplaceCapability {
  // Listing operations
  PUBLISH_LISTING = 'PUBLISH_LISTING',
  UPDATE_LISTING = 'UPDATE_LISTING',
  DELETE_LISTING = 'DELETE_LISTING',
  GET_LISTING = 'GET_LISTING',
  SEARCH_LISTINGS = 'SEARCH_LISTINGS',
  BULK_LISTING = 'BULK_LISTING',

  // Inventory
  SYNC_INVENTORY = 'SYNC_INVENTORY',
  UPDATE_INVENTORY = 'UPDATE_INVENTORY',
  GET_INVENTORY = 'GET_INVENTORY',

  // Orders
  SYNC_ORDERS = 'SYNC_ORDERS',
  GET_ORDER = 'GET_ORDER',
  UPDATE_ORDER = 'UPDATE_ORDER',
  CANCEL_ORDER = 'CANCEL_ORDER',

  // Shipment
  SYNC_SHIPMENTS = 'SYNC_SHIPMENTS',
  CREATE_SHIPMENT = 'CREATE_SHIPMENT',
  GET_SHIPMENT = 'GET_SHIPMENT',
  TRACK_SHIPMENT = 'TRACK_SHIPMENT',

  // Returns
  SYNC_RETURNS = 'SYNC_RETURNS',
  PROCESS_RETURN = 'PROCESS_RETURN',
  GET_RETURN = 'GET_RETURN',

  // Pricing
  SYNC_PRICING = 'SYNC_PRICING',
  UPDATE_PRICING = 'UPDATE_PRICING',
  GET_PRICING = 'GET_PRICING',
  REPRICING = 'REPRICING',

  // Catalog
  SYNC_CATALOG = 'SYNC_CATALOG',
  GET_CATALOG = 'GET_CATALOG',
  UPDATE_CATALOG = 'UPDATE_CATALOG',

  // Reports
  SYNC_REPORTS = 'SYNC_REPORTS',
  GET_REPORT = 'GET_REPORT',
  REQUEST_REPORT = 'REQUEST_REPORT',

  // Integrations
  WEBHOOKS = 'WEBHOOKS',
  MESSAGING = 'MESSAGING',

  // Infrastructure
  HEALTH_CHECK = 'HEALTH_CHECK',
  TEST_CONNECTION = 'TEST_CONNECTION',
}

// ── Error Codes ───────────────────────────────────────────────

export enum MarketplaceErrorCode {
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  AUTH_FAILED = 'AUTH_FAILED',
  AUTHORIZATION_FAILED = 'AUTHORIZATION_FAILED',
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  CREDENTIALS_EXPIRED = 'CREDENTIALS_EXPIRED',
  TIMEOUT = 'TIMEOUT',
  NOT_FOUND = 'NOT_FOUND',
  INVALID_REQUEST = 'INVALID_REQUEST',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  UNSUPPORTED_CAPABILITY = 'UNSUPPORTED_CAPABILITY',
  UNSUPPORTED_REGION = 'UNSUPPORTED_REGION',
  UNSUPPORTED_COUNTRY = 'UNSUPPORTED_COUNTRY',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  UNKNOWN = 'UNKNOWN',
}

export enum MarketplaceHealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
  UNKNOWN = 'UNKNOWN',
}

export enum MarketplaceCredentialType {
  API_KEY = 'API_KEY',
  OAUTH_TOKEN = 'OAUTH_TOKEN',
  CLIENT_CREDENTIALS = 'CLIENT_CREDENTIALS',
  BEARER_TOKEN = 'BEARER_TOKEN',
  CUSTOM = 'CUSTOM',
}

export enum MarketplaceCredentialEncryption {
  AES_256_GCM = 'AES_256_GCM',
  NONE = 'NONE',
}

export enum MarketplaceProviderEvent {
  REGISTERED = 'marketplace-provider-registered',
  UPDATED = 'marketplace-provider-updated',
  ENABLED = 'marketplace-provider-enabled',
  DISABLED = 'marketplace-provider-disabled',
  HEALTH_CHANGED = 'marketplace-provider-health-changed',
  CONNECTED = 'marketplace-provider-connected',
  DISCONNECTED = 'marketplace-provider-disconnected',
  VALIDATION_FAILED = 'marketplace-provider-validation-failed',
  CAPABILITY_CHANGED = 'marketplace-provider-capability-changed',
}

export enum MarketplaceIntegrationStrategy {
  REST_POLLING = 'REST_POLLING',
  WEBHOOK = 'WEBHOOK',
  HYBRID = 'HYBRID',
  BULK_FILE = 'BULK_FILE',
  GRAPHQL = 'GRAPHQL',
}

// ── Version ───────────────────────────────────────────────────

export interface MarketplaceApiVersion {
  major: number;
  minor: number;
  patch: number;
  label?: string; // e.g. 'v2024-10-01' for Shopify-style versioning
}

// ── Provider Metadata ─────────────────────────────────────────

export interface MarketplaceProviderCredentialField {
  key: string;
  label: string;
  required: boolean;
  sensitive: boolean;
  credentialType: MarketplaceCredentialType;
  placeholder?: string;
  description?: string;
}

export interface MarketplaceProviderMetadata {
  providerKey: string;
  providerName: string;
  displayName: string;
  description: string;
  version: MarketplaceApiVersion;
  website?: string;
  iconUrl?: string;

  supportedCountries: string[];
  supportedRegions: string[];
  supportedCurrencies: string[];
  supportedLanguages: string[];
  supportedMarketplaces: MarketplaceKey[];
  supportedIntegrationStrategies: MarketplaceIntegrationStrategy[];
  supportedCapabilities: MarketplaceCapability[];

  rateLimitPerMinute: number;
  timeoutMs: number;
  maxRetries: number;

  requiresCredentials: boolean;
  credentialFields: MarketplaceProviderCredentialField[];
}

// ── Retry / Rate Limit Config ────────────────────────────────

export interface MarketplaceRetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
  retryableErrors: MarketplaceErrorCode[];
}

export interface MarketplaceRateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  burstLimit: number;
}

// ── Provider Configuration ────────────────────────────────────

export interface MarketplaceFeatureFlags {
  bulkOperationsEnabled?: boolean;
  webhooksEnabled?: boolean;
  realtimeSyncEnabled?: boolean;
  sandboxMode?: boolean;
  [flag: string]: boolean | undefined;
}

export interface MarketplaceQueueConfiguration {
  concurrency?: number;
  jobAttempts?: number;
  jobBackoffMs?: number;
}

export interface MarketplaceProviderConfiguration {
  baseUrl?: string;
  apiVersion?: string;
  region?: string;
  country?: string;
  currency?: string;
  locale?: string;
  timeoutMs?: number;
  retryPolicy?: MarketplaceRetryPolicy;
  rateLimitConfig?: MarketplaceRateLimitConfig;
  queueConfig?: MarketplaceQueueConfiguration;
  featureFlags?: MarketplaceFeatureFlags;
  customSettings?: Record<string, unknown>;
}

export interface WorkspaceMarketplaceProviderConfig {
  id: string;
  workspaceId: string;
  providerKey: string;
  accountId?: string | null;
  isEnabled: boolean;
  priority: number;
  configuration: MarketplaceProviderConfiguration;
  encryptedCredentials?: string | null;
  credentialIv?: string | null;
  credentialAuthTag?: string | null;
  credentialType?: MarketplaceCredentialType | null;
  credentialExpiresAt?: Date | null;
  credentialValidatedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// ── Credentials ───────────────────────────────────────────────

export interface MarketplaceCredentials {
  workspaceId: string;
  providerKey: string;
  accountId?: string | null;
  credentialType: MarketplaceCredentialType;
  encryptionAlgorithm: MarketplaceCredentialEncryption;
  fields: Record<string, string>; // key → encrypted or plain value
  expiresAt?: Date | null;
  validatedAt?: Date | null;
}

export interface MarketplaceCredentialValidationResult {
  valid: boolean;
  missing: string[];
  expired: boolean;
  errors: string[];
}

// ── Marketplace Account ───────────────────────────────────────

export interface IMarketplaceAccount {
  id: string;
  workspaceId: string;
  providerKey: string;
  accountHandle: string; // e.g. seller ID, shop name
  displayName?: string | null;
  country?: string | null;
  region?: string | null;
  currency?: string | null;
  status: MarketplaceAccountStatus;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// ── Request Context ───────────────────────────────────────────

export interface MarketplaceRequestContext {
  correlationId: string;
  workspaceId: string;
  userId?: string | null;
  providerKey: string;
  accountId?: string | null;
  marketplaceKey: MarketplaceKey;
  country?: string;
  currency?: string;
  region?: string;
  locale?: string;
  requestMetadata?: Record<string, unknown>;
}

// ── Request / Response ────────────────────────────────────────

export interface MarketplaceRequest<TParams = Record<string, unknown>> {
  context: MarketplaceRequestContext;
  params: TParams;
  timeoutMs?: number;
}

export interface MarketplaceResponseMeta {
  processingTimeMs: number;
  providerKey: string;
  correlationId: string;
  requestId: string;
  rateLimitRemaining?: number;
  rateLimitReset?: Date;
  providerRaw?: unknown;
}

export interface MarketplaceResponse<TResult = unknown> {
  success: boolean;
  result?: TResult;
  errors: NormalizedMarketplaceError[];
  warnings: string[];
  meta: MarketplaceResponseMeta;
}

// ── Error Normalization ───────────────────────────────────────

export interface NormalizedMarketplaceError {
  code: MarketplaceErrorCode;
  message: string;
  providerKey: string;
  retryable: boolean;
  details?: unknown;
}

// ── Health ────────────────────────────────────────────────────

export interface MarketplaceHealthResult {
  providerKey: string;
  accountId?: string | null;
  status: MarketplaceHealthStatus;
  latencyMs?: number;
  message?: string | null;
  failureRate?: number;
  retryCount?: number;
  rateLimitStatus?: string | null;
  connectionStatus?: string | null;
  checkedAt: Date;
  details?: Record<string, unknown>;
}

// ── Capability Validation ─────────────────────────────────────

export interface CapabilityValidationResult {
  supported: boolean;
  capability: MarketplaceCapability;
  providerKey: string;
  version?: string;
  reason?: string;
  errors: string[];
}

export interface UnsupportedCapabilityError {
  code: MarketplaceErrorCode.UNSUPPORTED_CAPABILITY;
  capability: MarketplaceCapability;
  providerKey: string;
  message: string;
}

// ── Provider Interface ────────────────────────────────────────

export interface IMarketplaceProviderAdapter {
  readonly metadata: MarketplaceProviderMetadata;

  supportsCapability(capability: MarketplaceCapability): boolean;
  supportsCountry(country: string): boolean;
  supportsRegion(region: string): boolean;
  supportsMarketplace(marketplaceKey: MarketplaceKey): boolean;

  validateCredentials(
    credentials: MarketplaceCredentials,
  ): Promise<MarketplaceCredentialValidationResult>;

  testConnection(
    context: MarketplaceRequestContext,
    credentials: MarketplaceCredentials,
  ): Promise<MarketplaceHealthResult>;

  healthCheck(accountId?: string): Promise<MarketplaceHealthResult>;
}

// ── Registry Interface ────────────────────────────────────────

export interface IMarketplaceProviderRegistry {
  register(adapter: IMarketplaceProviderAdapter): void;
  update(providerKey: string, adapter: IMarketplaceProviderAdapter): void;
  enable(providerKey: string): void;
  disable(providerKey: string): void;
  remove(providerKey: string): void;
  get(providerKey: string): IMarketplaceProviderAdapter;
  getAll(): IMarketplaceProviderAdapter[];
  isRegistered(providerKey: string): boolean;
  getSupportedKeys(): string[];
  getCapable(capability: MarketplaceCapability): IMarketplaceProviderAdapter[];
  discover(): IMarketplaceProviderAdapter[];
  validate(providerKey: string): boolean;
}

// ── Audit Events ─────────────────────────────────────────────

export interface MarketplaceProviderAuditEvent {
  workspaceId: string;
  providerKey: string;
  accountId?: string | null;
  capability?: MarketplaceCapability;
  correlationId: string;
  success: boolean;
  durationMs: number;
  errorCode?: MarketplaceErrorCode;
  action: string;
  timestamp: Date;
}

// ── Job Payloads ─────────────────────────────────────────────

export interface MarketplaceHealthCheckJobPayload {
  providerKey: string;
  accountId?: string | null;
  workspaceId?: string | null;
}

export interface MarketplaceConnectionTestJobPayload {
  providerKey: string;
  accountId: string;
  workspaceId: string;
}

export interface MarketplaceCredentialValidationJobPayload {
  providerKey: string;
  accountId: string;
  workspaceId: string;
}

export interface MarketplaceCapabilityRefreshJobPayload {
  providerKey: string;
  workspaceId?: string | null;
}

export interface MarketplaceProviderEventPayload {
  event: MarketplaceProviderEvent;
  providerKey: string;
  accountId?: string | null;
  workspaceId?: string | null;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

// ── Metrics ──────────────────────────────────────────────────

export interface MarketplaceProviderMetrics {
  providerKey: string;
  accountId?: string | null;
  totalRequests: number;
  successCount: number;
  failureCount: number;
  retryCount: number;
  averageLatencyMs: number;
  rateLimitEventCount: number;
  healthStatus: MarketplaceHealthStatus;
  lastCheckedAt?: Date;
}

// ── Resolution Options ────────────────────────────────────────

export interface MarketplaceProviderResolveOptions {
  workspaceId: string;
  marketplaceKey?: MarketplaceKey;
  accountId?: string;
  country?: string;
  region?: string;
  capability?: MarketplaceCapability;
  preferredProviderKey?: string;
  configs?: WorkspaceMarketplaceProviderConfig[];
  failoverEnabled?: boolean;
}
