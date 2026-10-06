// =============================================================
// Marketplace Provider Configuration – Core Interfaces
// =============================================================

// ── Enums ─────────────────────────────────────────────────────

export enum ConfigurationStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  DISABLED = 'DISABLED',
  ARCHIVED = 'ARCHIVED',
}

export enum ConfigurationEvent {
  CREATED = 'marketplace-provider-configuration-created',
  UPDATED = 'marketplace-provider-configuration-updated',
  PUBLISHED = 'marketplace-provider-configuration-published',
  DISABLED = 'marketplace-provider-configuration-disabled',
  ENABLED = 'marketplace-provider-configuration-enabled',
  ROLLED_BACK = 'marketplace-provider-configuration-rolled-back',
  CLONED = 'marketplace-provider-configuration-cloned',
  ARCHIVED = 'marketplace-provider-configuration-archived',
}

export enum ConfigurationScope {
  GLOBAL = 'GLOBAL',         // No workspaceId — applies to all workspaces
  WORKSPACE = 'WORKSPACE',   // Workspace-specific override
}

// ── Retry / Rate Limit / Queue ────────────────────────────────

export interface RetryPolicyConfig {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
  maxBackoffMs?: number;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  burstLimit: number;
}

export interface QueueConfig {
  concurrency?: number;
  jobAttempts?: number;
  jobBackoffMs?: number;
  removeOnCompleteCount?: number;
  removeOnFailCount?: number;
}

export interface WebhookConfig {
  enabled: boolean;
  endpoint?: string | null;
  secret?: string | null; // stored masked; never plaintext in this module
  events?: string[];
  timeoutMs?: number;
  retryPolicy?: RetryPolicyConfig;
}

export interface SyncSettings {
  inventorySyncIntervalMs?: number;
  orderSyncIntervalMs?: number;
  priceSyncIntervalMs?: number;
  catalogSyncIntervalMs?: number;
  reportSyncIntervalMs?: number;
  enableRealTimeSync?: boolean;
}

export interface BatchProcessingConfig {
  batchSize?: number;
  maxConcurrentBatches?: number;
  delayBetweenBatchesMs?: number;
}

export interface PaginationConfig {
  defaultPageSize?: number;
  maxPageSize?: number;
}

export interface LoggingOptions {
  logRequests?: boolean;
  logResponses?: boolean;
  logRetries?: boolean;
  logRateLimitEvents?: boolean;
  level?: 'debug' | 'info' | 'warn' | 'error';
}

export interface MonitoringOptions {
  enableMetrics?: boolean;
  enableHealthChecks?: boolean;
  healthCheckIntervalMs?: number;
  alertOnFailureRateAbove?: number;
  alertOnLatencyAboveMs?: number;
}

export interface FeatureFlags {
  bulkOperationsEnabled?: boolean;
  webhooksEnabled?: boolean;
  realtimeSyncEnabled?: boolean;
  sandboxMode?: boolean;
  betaFeaturesEnabled?: boolean;
  [flag: string]: boolean | undefined;
}

// ── Main Configuration Payload ────────────────────────────────

export interface MarketplaceProviderConfigPayload {
  // Identity
  marketplaceKey?: string | null;
  country?: string | null;
  region?: string | null;
  currency?: string | null;
  locale?: string | null;
  apiVersion?: string | null;
  baseUrl?: string | null;

  // Behaviour
  isEnabled?: boolean;
  priority?: number;

  // Network
  timeoutMs?: number;
  retryPolicy?: RetryPolicyConfig | null;
  rateLimitConfig?: RateLimitConfig | null;

  // Queue
  queueConfig?: QueueConfig | null;

  // Webhook
  webhookConfig?: WebhookConfig | null;

  // Sync
  syncSettings?: SyncSettings | null;

  // Batch
  batchProcessingConfig?: BatchProcessingConfig | null;

  // Pagination
  paginationConfig?: PaginationConfig | null;

  // Feature flags
  featureFlags?: FeatureFlags | null;

  // Logging / monitoring
  loggingOptions?: LoggingOptions | null;
  monitoringOptions?: MonitoringOptions | null;

  // Arbitrary provider-specific overrides
  customSettings?: Record<string, unknown> | null;
}

// ── Core Entities ─────────────────────────────────────────────

export interface IMarketplaceProviderConfig {
  id: string;
  workspaceId?: string | null;
  scope: ConfigurationScope;
  providerKey: string;
  accountId?: string | null;
  name: string;
  description?: string | null;
  status: ConfigurationStatus;
  version: number;
  publishedVersion?: number | null;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  payload: MarketplaceProviderConfigPayload;
  createdBy?: string | null;
  updatedBy?: string | null;
  approvedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IMarketplaceProviderConfigHistory {
  id: string;
  configId: string;
  workspaceId?: string | null;
  providerKey: string;
  version: number;
  status: ConfigurationStatus;
  payload: MarketplaceProviderConfigPayload;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

// ── Validation ────────────────────────────────────────────────

export interface ConfigValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigValidationError[];
  warnings: string[];
}

// ── Cache ─────────────────────────────────────────────────────

export interface CachedConfig {
  config: IMarketplaceProviderConfig;
  cachedAt: Date;
  ttlMs: number;
}

// ── Filter / Sort ─────────────────────────────────────────────

export interface ConfigurationFilterOptions {
  workspaceId?: string;
  providerKey?: string;
  accountId?: string;
  marketplaceKey?: string;
  country?: string;
  region?: string;
  status?: ConfigurationStatus | ConfigurationStatus[];
  scope?: ConfigurationScope;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ── Job Payloads ─────────────────────────────────────────────

export interface ConfigurationEventPayload {
  event: ConfigurationEvent;
  configId: string;
  providerKey: string;
  workspaceId?: string | null;
  accountId?: string | null;
  version?: number;
  performedBy?: string | null;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}
