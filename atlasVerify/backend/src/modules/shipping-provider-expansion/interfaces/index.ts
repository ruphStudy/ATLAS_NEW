// =============================================================
// Shipping Provider Expansion Framework – Core Interfaces & Enums
//
// Tracks onboarding/rollout/compatibility/eligibility for providers
// registered in the Shipping Provider Foundation
// (`ShippingProviderRegistry`/`ShippingProviderFactory`/
// `ShippingProviderHealthMonitor`/`ShippingProviderErrorNormalizer`) —
// `providerKey` is always a plain reference into that registry; none of
// its contracts, capability definitions, credentials, health checks or
// error normalization are re-implemented here.
// =============================================================

export enum ShippingProviderRolloutState {
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

export enum ShippingProviderExpansionEvent {
  EXPANSION_ONBOARDED = 'shipping-provider-expansion.onboarded',
  EXPANSION_UPDATED = 'shipping-provider-expansion.updated',
  ROLLOUT_PROMOTED = 'shipping-provider-expansion.rollout_promoted',
  ROLLOUT_DEMOTED = 'shipping-provider-expansion.rollout_demoted',
  DEPRECATED = 'shipping-provider-expansion.deprecated',
  DISABLED = 'shipping-provider-expansion.disabled',
  COMPATIBILITY_VALIDATED = 'shipping-provider-expansion.compatibility_validated',
  COMPATIBILITY_FAILED = 'shipping-provider-expansion.compatibility_failed',
  CAPABILITY_UNSUPPORTED = 'shipping-provider-expansion.capability_unsupported',
  FALLBACK_USED = 'shipping-provider-expansion.fallback_used',
  CACHE_INVALIDATED = 'shipping-provider-expansion.cache_invalidated',
}

export enum ExpansionValidationIssueType {
  INVALID_EXPANSION = 'INVALID_EXPANSION',
  DUPLICATE_EXPANSION = 'DUPLICATE_EXPANSION',
  UNKNOWN_COUNTRY = 'UNKNOWN_COUNTRY',
  ADAPTER_NOT_REGISTERED = 'ADAPTER_NOT_REGISTERED',
  ADAPTER_INCOMPATIBLE = 'ADAPTER_INCOMPATIBLE',
}

// ── Core Entity ────────────────────────────────────────────────

export interface IShippingProviderExpansion {
  id: string;
  providerKey: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  rolloutState: ShippingProviderRolloutState;
  version: number;
  apiVersionLabel?: string | null;
  countryCodes: string[];
  regionCodes: string[];
  serviceLevels: string[];
  eligibilityScope: EligibilityScope;
  eligibleWorkspaceIds: string[];
  adapterCompatibilityStatus: AdapterCompatibilityStatus;
  compatibilityIssues: string[];
  backwardCompatibleApiVersions: string[];
  fallbackProviderKey?: string | null;
  pickupRules: Record<string, unknown>;
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

export interface IShippingProviderExpansionHistory {
  id: string;
  expansionId: string;
  version: number;
  rolloutState: ShippingProviderRolloutState;
  snapshot: Record<string, unknown>;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

// ── Adapter Compatibility ─────────────────────────────────────

export interface IAdapterCompatibilityResult {
  providerKey: string;
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

export interface ShippingProviderExpansionFilterOptions {
  providerKey?: string | null;
  workspaceId?: string | null;
  organizationId?: string | null;
  rolloutState?: ShippingProviderRolloutState | null;
  search?: string | null;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ── Cache ─────────────────────────────────────────────────────

export interface CachedExpansion {
  expansion: IShippingProviderExpansion;
  cachedAt: number;
}

// ── Event Payload ─────────────────────────────────────────────

export interface ShippingProviderExpansionEventPayload {
  event: ShippingProviderExpansionEvent;
  expansionId?: string | null;
  providerKey?: string | null;
  workspaceId?: string | null;
  rolloutState?: string | null;
  changedBy?: string | null;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}
