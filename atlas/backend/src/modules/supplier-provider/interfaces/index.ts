// =============================================================
// Supplier Provider Foundation – Core Interfaces & Contracts
// =============================================================

// ── Provider Identity ─────────────────────────────────────────

export enum SupplierProviderCode {
  INDIAMART = 'INDIAMART',
  TRADEINDIA = 'TRADEINDIA',
  ALIBABA = 'ALIBABA',
  MADE_IN_CHINA = 'MADE_IN_CHINA',
  GLOBAL_SOURCES = 'GLOBAL_SOURCES',
  MANUAL = 'MANUAL',
}

export enum ProviderStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DEGRADED = 'DEGRADED',
  MAINTENANCE = 'MAINTENANCE',
  DEPRECATED = 'DEPRECATED',
}

export enum ProviderCapability {
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

export enum ProviderErrorCode {
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  AUTH_FAILED = 'AUTH_FAILED',
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TIMEOUT = 'TIMEOUT',
  NOT_FOUND = 'NOT_FOUND',
  INVALID_REQUEST = 'INVALID_REQUEST',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  UNKNOWN = 'UNKNOWN',
}

export enum ProviderHealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
  UNKNOWN = 'UNKNOWN',
}

export enum CredentialEncryptionAlgorithm {
  AES_256_GCM = 'AES_256_GCM',
  NONE = 'NONE',
}

// ── Metadata ─────────────────────────────────────────────────

export interface ProviderVersion {
  major: number;
  minor: number;
  patch: number;
}

export interface ProviderMetadata {
  code: SupplierProviderCode;
  displayName: string;
  description: string;
  version: ProviderVersion;
  website?: string;
  iconUrl?: string;
  supportedCountries: string[];
  capabilities: ProviderCapability[];
  rateLimitPerMinute: number;
  timeoutMs: number;
  maxRetries: number;
  requiresCredentials: boolean;
  credentialFields: ProviderCredentialField[];
}

export interface ProviderCredentialField {
  key: string;
  label: string;
  required: boolean;
  sensitive: boolean;
  placeholder?: string;
}

// ── Configuration ─────────────────────────────────────────────

export interface ProviderRetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
  retryableErrors: ProviderErrorCode[];
}

export interface ProviderRateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  burstLimit: number;
}

export interface WorkspaceProviderConfig {
  workspaceId: string;
  providerCode: SupplierProviderCode;
  isEnabled: boolean;
  priority: number;
  timeoutMs: number;
  retryPolicy: ProviderRetryPolicy;
  rateLimitConfig: ProviderRateLimitConfig;
  customSettings?: Record<string, unknown>;
}

export interface ProviderCredentials {
  workspaceId: string;
  providerCode: SupplierProviderCode;
  encryptionAlgorithm: CredentialEncryptionAlgorithm;
  fields: Record<string, string>; // key → encrypted or plain value
  validatedAt?: Date | null;
  expiresAt?: Date | null;
}

// ── Common Request/Response Models ───────────────────────────

export interface ProviderPagination {
  page: number;
  limit: number;
  offset: number;
}

export interface ProviderSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface ProviderFilter {
  country?: string;
  category?: string;
  minRating?: number;
  minOrderQty?: number;
  maxLeadTimeDays?: number;
  verifiedOnly?: boolean;
  [key: string]: unknown;
}

export interface ProviderRequest<TParams = Record<string, unknown>> {
  requestId: string;
  workspaceId: string;
  providerCode: SupplierProviderCode;
  params: TParams;
  pagination?: ProviderPagination;
  sort?: ProviderSort;
  filter?: ProviderFilter;
  timeoutMs?: number;
}

export interface ProviderResponse<TData = unknown> {
  requestId: string;
  providerCode: SupplierProviderCode;
  success: boolean;
  data?: TData;
  error?: NormalizedProviderError;
  meta: ProviderResponseMeta;
}

export interface ProviderResponseMeta {
  durationMs: number;
  totalResults?: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
  providerRaw?: unknown;
}

export interface NormalizedProviderError {
  code: ProviderErrorCode;
  message: string;
  providerCode: SupplierProviderCode;
  retryable: boolean;
  details?: unknown;
}

// ── Domain Models (ATLAS Normalized) ─────────────────────────

export interface AtlasSupplier {
  providerCode: SupplierProviderCode;
  providerSupplierId: string;
  name: string;
  country: string;
  city?: string | null;
  website?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  categories: string[];
  minOrderQuantity?: number | null;
  avgLeadTimeDays?: number | null;
  overallRating?: number | null;
  isVerified: boolean;
  tier?: string | null;
  rawData: Record<string, unknown>;
}

export interface AtlasProduct {
  providerCode: SupplierProviderCode;
  providerProductId: string;
  name: string;
  description?: string | null;
  category?: string | null;
  subCategory?: string | null;
  brand?: string | null;
  unitPrice?: number | null;
  currency?: string | null;
  minOrderQuantity?: number | null;
  images: string[];
  attributes: Record<string, string>;
  supplierProviderSupplierId?: string | null;
  rawData: Record<string, unknown>;
}

export interface AtlasQuotation {
  providerCode: SupplierProviderCode;
  providerQuotationId: string;
  supplierId: string;
  productId?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  leadTimeDays?: number | null;
  validUntil?: Date | null;
  terms?: string | null;
  rawData: Record<string, unknown>;
}

export interface AtlasValidationResult {
  isValid: boolean;
  score: number; // 0–100
  checks: AtlasValidationCheck[];
  summary: string;
}

export interface AtlasValidationCheck {
  checkName: string;
  passed: boolean;
  score: number;
  notes?: string | null;
}

// ── Health Check ──────────────────────────────────────────────

export interface ProviderHealthResult {
  providerCode: SupplierProviderCode;
  status: ProviderHealthStatus;
  latencyMs?: number;
  message?: string | null;
  checkedAt: Date;
  details?: Record<string, unknown>;
}

// ── Specific Request Param Types ─────────────────────────────

export interface SearchSuppliersParams {
  keyword: string;
  country?: string;
  category?: string;
}

export interface SearchProductsParams {
  keyword: string;
  country?: string;
  category?: string;
  supplierId?: string;
}

export interface GetSupplierDetailsParams {
  providerSupplierId: string;
}

export interface GetProductDetailsParams {
  providerProductId: string;
}

export interface RequestQuotationParams {
  providerSupplierId: string;
  providerProductId?: string;
  quantity: number;
  requirements?: string;
}

export interface DownloadCatalogParams {
  providerSupplierId: string;
  category?: string;
}

export interface ValidateSupplierParams {
  providerSupplierId: string;
}

export interface ValidateProductParams {
  providerProductId: string;
}

// ── Core Provider Interface ───────────────────────────────────

export interface ISupplierProviderAdapter {
  readonly metadata: ProviderMetadata;

  supportsCapability(capability: ProviderCapability): boolean;
  supportsCountry(country: string): boolean;

  searchSuppliers(
    request: ProviderRequest<SearchSuppliersParams>,
  ): AsyncIterable<AtlasSupplier>;

  searchProducts(
    request: ProviderRequest<SearchProductsParams>,
  ): Promise<ProviderResponse<AtlasProduct[]>>;

  getSupplierDetails(
    request: ProviderRequest<GetSupplierDetailsParams>,
  ): Promise<ProviderResponse<AtlasSupplier>>;

  getProductDetails(
    request: ProviderRequest<GetProductDetailsParams>,
  ): Promise<ProviderResponse<AtlasProduct>>;

  requestQuotation(
    request: ProviderRequest<RequestQuotationParams>,
  ): Promise<ProviderResponse<AtlasQuotation>>;

  downloadCatalog(
    request: ProviderRequest<DownloadCatalogParams>,
  ): Promise<ProviderResponse<AtlasProduct[]>>;

  validateSupplier(
    request: ProviderRequest<ValidateSupplierParams>,
  ): Promise<ProviderResponse<AtlasValidationResult>>;

  validateProduct(
    request: ProviderRequest<ValidateProductParams>,
  ): Promise<ProviderResponse<AtlasValidationResult>>;

  healthCheck(): Promise<ProviderHealthResult>;
}

// ── Provider Registry Interface ───────────────────────────────

export interface ISupplierProviderRegistry {
  register(adapter: ISupplierProviderAdapter): void;
  get(providerCode: string): ISupplierProviderAdapter;
  getAll(): ISupplierProviderAdapter[];
  isRegistered(providerCode: string): boolean;
  getSupportedCodes(): SupplierProviderCode[];
  getCapable(capability: ProviderCapability): ISupplierProviderAdapter[];
}

// ── Audit Events ─────────────────────────────────────────────

export interface ProviderAuditEvent {
  workspaceId: string;
  providerCode: SupplierProviderCode;
  capability: ProviderCapability;
  requestId: string;
  success: boolean;
  durationMs: number;
  errorCode?: ProviderErrorCode;
  timestamp: Date;
}
