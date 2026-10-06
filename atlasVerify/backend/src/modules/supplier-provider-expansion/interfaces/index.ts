// =============================================================
// Supplier Provider Expansion Framework – Core Interfaces & Enums
//
// Tracks onboarding/rollout/compatibility/eligibility for providers
// registered in the existing Supplier Provider Foundation
// (`SupplierProviderRegistry`/`SupplierAdapterRegistry`/
// `SupplierProviderFactory`/`SupplierProviderHealthMonitor`/
// `ProviderErrorNormalizer`) — `providerCode` is always a plain
// reference into that registry; none of its contracts, capability
// definitions, credentials, health checks or error normalization are
// re-implemented here.
// =============================================================

export enum SupplierProviderRolloutState {
  DRAFT = 'DRAFT',
  BETA = 'BETA',
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
  DISABLED = 'DISABLED',
}

export enum AdapterCompatibilityStatus {
  COMPATIBLE = 'COMPATIBLE',
  INCOMPATIBLE = 'INCOMPATIBLE',
  UNVALIDATED = 'UNVALIDATED',
}

export enum EligibilityScope {
  ALL = 'ALL',
  ALLOWLIST = 'ALLOWLIST',
}

export enum SupplierProviderExpansionEvent {
  EXPANSION_ONBOARDED = 'supplier-provider-expansion.onboarded',
  EXPANSION_UPDATED = 'supplier-provider-expansion.updated',
  ROLLOUT_PROMOTED = 'supplier-provider-expansion.rollout_promoted',
  ROLLOUT_DEMOTED = 'supplier-provider-expansion.rollout_demoted',
  DEPRECATED = 'supplier-provider-expansion.deprecated',
  DISABLED = 'supplier-provider-expansion.disabled',
  COMPATIBILITY_VALIDATED = 'supplier-provider-expansion.compatibility_validated',
  COMPATIBILITY_FAILED = 'supplier-provider-expansion.compatibility_failed',
  CAPABILITY_UNSUPPORTED = 'supplier-provider-expansion.capability_unsupported',
  FALLBACK_USED = 'supplier-provider-expansion.fallback_used',
  CACHE_INVALIDATED = 'supplier-provider-expansion.cache_invalidated',
}

export enum ExpansionValidationIssueType {
  INVALID_EXPANSION = 'INVALID_EXPANSION',
  DUPLICATE_EXPANSION = 'DUPLICATE_EXPANSION',
  UNKNOWN_COUNTRY = 'UNKNOWN_COUNTRY',
  UNKNOWN_CURRENCY = 'UNKNOWN_CURRENCY',
  ADAPTER_NOT_REGISTERED = 'ADAPTER_NOT_REGISTERED',
  ADAPTER_INCOMPATIBLE = 'ADAPTER_INCOMPATIBLE',
}

// ── Core Entity ────────────────────────────────────────────────

export interface ISupplierProviderExpansion {
  id: string;
  providerCode: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  rolloutState: SupplierProviderRolloutState;
  version: number;
  apiVersionLabel?: string | null;
  countryCodes: string[];
  regionCodes: string[];
  currencyCodes: string[];
  integrationStrategies: string[];
  eligibilityScope: EligibilityScope;
  eligibleWorkspaceIds: string[];
  adapterCompatibilityStatus: AdapterCompatibilityStatus;
  compatibilityIssues: string[];
  backwardCompatibleApiVersions: string[];
  fallbackProviderCode?: string | null;
  endpointConfig: Record<string, unknown>;
  rateLimitConfig: Record<string, unknown>;
  featureFlags: Record<string, unknown>;
  onboardedAt?: Date | null;
  betaAt?: Date | null;
  activatedAt?: Date | null;
  deprecatedAt?: Date | null;
  disabledAt?: Date | null;
  settings: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface ISupplierProviderExpansionHistory {
  id: string;
  expansionId: string;
  version: number;
  rolloutState: SupplierProviderRolloutState;
  snapshot: Record<string, unknown>;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

// ── Adapter Compatibility ─────────────────────────────────────

export interface IAdapterCompatibilityResult {
  providerCode: string;
  status: AdapterCompatibilityStatus;
  issues: string[];
  checkedAt: Date;
}

// ── Eligibility ────────────────────────────────────────────────

export interface IEligibilityContext {
  workspaceId: string;
  countryCode?: string | null;
}

export interface IEligibilityResult {
  eligible: boolean;
  reason?: string;
}

// ── Validation ────────────────────────────────────────────────

export interface IExpansionValidationIssue {
  type: ExpansionValidationIssueType;
  message: string;
}

export interface IExpansionValidationResult {
  valid: boolean;
  issues: IExpansionValidationIssue[];
  warnings: string[];
}

// ── Filters ───────────────────────────────────────────────────

export interface SupplierProviderExpansionFilterOptions {
  providerCode?: string | null;
  workspaceId?: string | null;
  organizationId?: string | null;
  rolloutState?: SupplierProviderRolloutState | null;
  search?: string | null;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ── Cache ─────────────────────────────────────────────────────

export interface CachedExpansion {
  expansion: ISupplierProviderExpansion;
  cachedAt: number;
}

// ── Event Payload ─────────────────────────────────────────────

export interface SupplierProviderExpansionEventPayload {
  event: SupplierProviderExpansionEvent;
  expansionId?: string | null;
  providerCode?: string | null;
  workspaceId?: string | null;
  rolloutState?: string | null;
  changedBy?: string | null;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}
