// =============================================================
// Currency Engine – Core Interfaces & Enums
// =============================================================

// ── Currency Status ────────────────────────────────────────────

export enum CurrencyStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  ARCHIVED = 'ARCHIVED',
}

// ── Rounding ──────────────────────────────────────────────────

export enum RoundingMode {
  HALF_UP = 'HALF_UP',
  HALF_DOWN = 'HALF_DOWN',
  HALF_EVEN = 'HALF_EVEN',
  UP = 'UP',
  DOWN = 'DOWN',
  CEILING = 'CEILING',
  FLOOR = 'FLOOR',
}

// ── Rate Source ───────────────────────────────────────────────

export enum RateSource {
  MANUAL = 'MANUAL',
  SCHEDULED = 'SCHEDULED',
  PROVIDER = 'PROVIDER',
}

// ── Rate Type ─────────────────────────────────────────────────

export enum RateType {
  SPOT = 'SPOT',
  HISTORICAL = 'HISTORICAL',
  DAILY_CLOSE = 'DAILY_CLOSE',
  CUSTOM = 'CUSTOM',
}

// ── Rate Lifecycle Status ────────────────────────────────────

export enum RateStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
}

// ── Conversion Direction ─────────────────────────────────────

export enum ConversionDirection {
  IDENTITY = 'IDENTITY', // same currency, rate = 1
  DIRECT = 'DIRECT', // a stored base→quote rate
  INVERSE = 'INVERSE', // derived from a stored quote→base rate
  CROSS = 'CROSS', // derived via a pivot currency
}

// ── Events ────────────────────────────────────────────────────

export enum CurrencyEvent {
  REGISTERED = 'currency-registered',
  UPDATED = 'currency-updated',
  ENABLED = 'currency-enabled',
  DISABLED = 'currency-disabled',
  ARCHIVED = 'currency-archived',
  RESTORED = 'currency-restored',
  WORKSPACE_CONFIGURED = 'currency-workspace-configured',
  RATE_RECORDED = 'currency-rate-recorded',
  RATE_REJECTED = 'currency-rate-rejected',
  RATE_UPDATED = 'currency-rate-updated',
  RATE_APPROVED = 'currency-rate-approved',
  RATE_PUBLISHED = 'currency-rate-published',
  RATE_ARCHIVED = 'currency-rate-archived',
  ABNORMAL_RATE_DETECTED = 'currency-abnormal-rate-detected',
  STALE_RATE_DETECTED = 'currency-stale-rate-detected',
  SYNC_FAILED = 'currency-sync-failed',
  PROVIDER_CONFIGURED = 'currency-provider-configured',
  CONVERSION_PERFORMED = 'currency-conversion-performed',
  CACHE_INVALIDATED = 'currency-cache-invalidated',
}

// ── Validation Issue Type ────────────────────────────────────

export enum CurrencyValidationIssueType {
  CURRENCY_NOT_SUPPORTED = 'CURRENCY_NOT_SUPPORTED',
  DUPLICATE_RATE = 'DUPLICATE_RATE',
  INVALID_RATE = 'INVALID_RATE',
  RATE_NOT_FOUND = 'RATE_NOT_FOUND',
  STALE_RATE = 'STALE_RATE',
  MISSING_RATE = 'MISSING_RATE',
  ABNORMAL_RATE = 'ABNORMAL_RATE',
}

// ── Core Entities ─────────────────────────────────────────────

export interface ICurrency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  roundingMode: RoundingMode;
  status: CurrencyStatus;
  version: number;
  metadata: Record<string, unknown>;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface ICurrencyHistory {
  id: string;
  currencyId: string;
  code: string;
  version: number;
  status: CurrencyStatus;
  snapshot: Record<string, unknown>;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export interface IWorkspaceCurrencyConfig {
  id: string;
  workspaceId: string;
  baseCurrency: string;
  reportingCurrency?: string | null;
  staleToleranceMinutes: number;
  configuration: Record<string, unknown>;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IExchangeRate {
  id: string;
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  rateType: RateType;
  source: RateSource | string;
  providerKey?: string | null;
  effectiveAt: Date;
  fetchedAt: Date;
  status: RateStatus;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  publishedAt?: Date | null;
  isAbnormal: boolean;
  supersedesId?: string | null;
  version: number;
  workspaceId?: string | null;
  metadata: Record<string, unknown>;
  createdBy?: string | null;
  createdAt: Date;
  deletedAt?: Date | null;
}

export interface IExchangeRateProviderConfig {
  id: string;
  workspaceId?: string | null;
  providerKey: string;
  isEnabled: boolean;
  priority: number;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// ── Provider Contract ─────────────────────────────────────────

/**
 * Generic contract every exchange-rate provider adapter implements.
 * The Currency Engine never hardcodes a specific provider (no concrete
 * FX API integration lives here) — it only registers and calls adapters
 * through this interface, mirroring `IMarketplaceProviderAdapter`.
 */
export interface IExchangeRateProviderAdapter {
  readonly providerKey: string;
  fetchRate(baseCurrency: string, quoteCurrency: string): Promise<IProviderRateQuote>;
}

export interface IProviderRateQuote {
  rate: number;
  fetchedAt: Date;
  metadata?: Record<string, unknown>;
}

// ── Rate Recording ────────────────────────────────────────────

export interface RecordRateRequest {
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  rateType?: RateType;
  source: RateSource;
  providerKey?: string | null;
  effectiveAt?: Date;
  workspaceId?: string | null;
  /** When true, the rate is recorded as PENDING_APPROVAL instead of auto-publishing. */
  requiresApproval?: boolean;
  /** Set by `updateRate` — links a new version to the row it supersedes without mutating it. */
  supersedesId?: string | null;
  metadata?: Record<string, unknown>;
}

// ── Provider Fallback Resolution ──────────────────────────────

export interface ProviderRateResolutionResult {
  quote: IProviderRateQuote;
  providerKey: string;
  attempted: string[];
}

// ── Bulk Import ────────────────────────────────────────────────

export interface BulkImportRateItem {
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  rateType?: RateType;
  effectiveAt?: Date;
  workspaceId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface BulkImportRateItemResult {
  item: BulkImportRateItem;
  success: boolean;
  rateId?: string;
  error?: string;
}

export interface BulkImportRateResult {
  total: number;
  succeeded: number;
  failed: number;
  results: BulkImportRateItemResult[];
}

// ── Rate Resolution ───────────────────────────────────────────

export interface RateResolutionRequest {
  baseCurrency: string;
  quoteCurrency: string;
  asOfDate?: Date | null;
  workspaceId?: string | null;
}

export interface RateResolutionResult {
  rate: number;
  direction: ConversionDirection;
  effectiveAt: Date;
  fetchedAt: Date;
  source: RateSource | string;
  stale: boolean;
  ageMinutes: number;
}

// ── Conversion ────────────────────────────────────────────────

export interface ConversionRequest {
  workspaceId?: string | null;
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  asOfDate?: Date | null;
  /** When true, a stale current-rate does not raise — the result is flagged instead. Ignored for historical (asOfDate) lookups, which are never "stale". */
  allowStale?: boolean;
}

export interface ConversionResult {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  convertedCurrency: string;
  rate: number;
  rateDirection: ConversionDirection;
  rateEffectiveAt: Date;
  rateSource: RateSource | string;
  stale: boolean;
  conversionTimestamp: Date;
}

// ── Validation ────────────────────────────────────────────────

export interface CurrencyValidationIssue {
  type: CurrencyValidationIssueType;
  message: string;
}

export interface CurrencyValidationResult {
  valid: boolean;
  issues: CurrencyValidationIssue[];
  warnings: string[];
  isAbnormal?: boolean;
}

// ── Filters ───────────────────────────────────────────────────

export interface CurrencyFilterOptions {
  code?: string | null;
  status?: CurrencyStatus | null;
  search?: string | null;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ExchangeRateFilterOptions {
  baseCurrency?: string | null;
  quoteCurrency?: string | null;
  source?: RateSource | string | null;
  workspaceId?: string | null;
  fromDate?: Date | null;
  toDate?: Date | null;
  page?: number;
  limit?: number;
}

// ── Cache Entries ─────────────────────────────────────────────

export interface CachedCurrency {
  currency: ICurrency;
  cachedAt: number;
}

export interface CachedRateResolution {
  result: RateResolutionResult;
  cachedAt: number;
}

// ── Event Payload ─────────────────────────────────────────────

export interface CurrencyEventPayload {
  event: CurrencyEvent;
  currencyCode?: string | null;
  baseCurrency?: string | null;
  quoteCurrency?: string | null;
  rateId?: string | null;
  workspaceId?: string | null;
  changedBy?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}
