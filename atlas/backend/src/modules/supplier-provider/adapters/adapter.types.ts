// ── Integration Strategy ──────────────────────────────────────

export enum IntegrationStrategy {
  REST_API = 'REST_API',
  GRAPHQL_API = 'GRAPHQL_API',
  FILE_IMPORT = 'FILE_IMPORT',
  FILE_EXPORT = 'FILE_EXPORT',
  EMAIL_RFQ = 'EMAIL_RFQ',
  MANUAL_WORKFLOW = 'MANUAL_WORKFLOW',
}

// ── Extended Capability (superset of ProviderCapability) ──────

export enum AdapterCapability {
  SEARCH_SUPPLIERS = 'SEARCH_SUPPLIERS',
  SEARCH_PRODUCTS = 'SEARCH_PRODUCTS',
  GET_SUPPLIER_DETAILS = 'GET_SUPPLIER_DETAILS',
  GET_PRODUCT_DETAILS = 'GET_PRODUCT_DETAILS',
  REQUEST_QUOTATION = 'REQUEST_QUOTATION',
  DOWNLOAD_CATALOG = 'DOWNLOAD_CATALOG',
  VALIDATE_SUPPLIER = 'VALIDATE_SUPPLIER',
  VALIDATE_PRODUCT = 'VALIDATE_PRODUCT',
  SUBMIT_PURCHASE_ORDER = 'SUBMIT_PURCHASE_ORDER',
  TRACK_SHIPMENT = 'TRACK_SHIPMENT',
  HEALTH_CHECK = 'HEALTH_CHECK',
  TEST_CONNECTION = 'TEST_CONNECTION',
}

// ── External Reference ────────────────────────────────────────

export interface ExternalReference {
  providerCode: string;
  externalId: string;
  externalUrl?: string | null;
  externalType?: string | null;
  syncedAt?: Date | null;
}

// ── Idempotency ───────────────────────────────────────────────

export interface IdempotencyRecord {
  key: string;
  providerCode: string;
  workspaceId: string;
  operation: string;
  requestHash: string;
  responseHash?: string | null;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  createdAt: Date;
  expiresAt: Date;
}

// ── Provider Rate-Limit State ─────────────────────────────────

export interface ProviderRateLimitState {
  providerCode: string;
  workspaceId: string;
  requestsThisMinute: number;
  requestsThisHour: number;
  lastResetMinute: Date;
  lastResetHour: Date;
  nextAllowedAt?: Date | null;
}

// ── Request Context ───────────────────────────────────────────

export interface AdapterRequestContext {
  correlationId: string;
  requestId: string;
  workspaceId: string;
  providerCode: string;
  capability: AdapterCapability;
  strategy: IntegrationStrategy;
  timeoutMs: number;
  idempotencyKey?: string | null;
  userId?: string | null;
  initiatedAt: Date;
  meta?: Record<string, unknown>;
}

// ── Response Metadata ─────────────────────────────────────────

export interface AdapterResponseMetadata {
  correlationId: string;
  requestId: string;
  providerCode: string;
  capability: AdapterCapability;
  strategy: IntegrationStrategy;
  durationMs: number;
  attempt: number;
  totalAttempts: number;
  rateLimitRemaining?: number | null;
  rateLimitReset?: Date | null;
  providerRawMeta?: Record<string, unknown> | null;
}

// ── Adapter Metrics ───────────────────────────────────────────

export interface AdapterMetricEvent {
  providerCode: string;
  capability: AdapterCapability;
  strategy: IntegrationStrategy;
  workspaceId: string;
  success: boolean;
  durationMs: number;
  attempt: number;
  httpStatus?: number | null;
  errorCode?: string | null;
  timestamp: Date;
}

// ── Adapter Audit Event ───────────────────────────────────────

export interface AdapterAuditEvent {
  correlationId: string;
  requestId: string;
  workspaceId: string;
  providerCode: string;
  capability: AdapterCapability;
  strategy: IntegrationStrategy;
  userId?: string | null;
  success: boolean;
  durationMs: number;
  attempt: number;
  errorCode?: string | null;
  idempotencyKey?: string | null;
  timestamp: Date;
}

// ── Supported Regions ─────────────────────────────────────────

export type SupportedRegion = string;

// ── Adapter Metadata ──────────────────────────────────────────

export interface AdapterMetadata {
  providerCode: string;
  displayName: string;
  description: string;
  version: { major: number; minor: number; patch: number };
  website?: string | null;
  iconUrl?: string | null;
  supportedRegions: SupportedRegion[];
  supportedCountries: string[];
  supportedCurrencies: string[];
  capabilities: AdapterCapability[];
  integrationStrategies: IntegrationStrategy[];
  rateLimitPerMinute: number;
  timeoutMs: number;
  maxRetries: number;
  requiresCredentials: boolean;
  credentialFields: AdapterCredentialField[];
}

export interface AdapterCredentialField {
  key: string;
  label: string;
  required: boolean;
  sensitive: boolean;
  description?: string | null;
  placeholder?: string | null;
}

// ── Pagination ────────────────────────────────────────────────

export interface AdapterPaginationInput {
  page: number;
  limit: number;
}

export interface AdapterPaginationOutput {
  page: number;
  limit: number;
  offset: number;
  total?: number | null;
  hasMore: boolean;
}

// ── Normalized Shipment Status ────────────────────────────────

export enum NormalizedShipmentStatus {
  PENDING = 'PENDING',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  EXCEPTION = 'EXCEPTION',
  RETURNED = 'RETURNED',
  UNKNOWN = 'UNKNOWN',
}

// ── Normalized Verification Status ───────────────────────────

export enum NormalizedVerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

// ── Adapter Health Status ─────────────────────────────────────

export interface AdapterHealthStatus {
  providerCode: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';
  latencyMs?: number | null;
  message?: string | null;
  checkedAt: Date;
  strategy: IntegrationStrategy;
  details?: Record<string, unknown> | null;
}

// ── Adapter Error ─────────────────────────────────────────────

export interface AdapterError {
  code: string;
  message: string;
  providerCode: string;
  retryable: boolean;
  httpStatus?: number | null;
  providerErrorCode?: string | null;
  details?: unknown;
}
