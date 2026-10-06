// =============================================================
// Marketplace Expansion Framework – Core Interfaces & Enums
//
// Tracks onboarding/rollout/compatibility/eligibility for marketplaces
// registered in the existing Multi-Marketplace Framework
// (`MarketplaceProviderRegistry`/`MarketplaceProviderFactoryService`/
// `MarketplaceCapabilityService`/`MarketplaceHealthMonitor`/
// `MarketplaceVersionManager`) — `providerKey` is always a plain
// reference into that registry; none of its contracts, capability
// definitions, credentials, health checks or version tracking are
// re-implemented here.
// =============================================================

export enum MarketplaceRolloutState {
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

export enum MarketplaceExpansionEvent {
  EXPANSION_ONBOARDED = 'marketplace-expansion.onboarded',
  EXPANSION_UPDATED = 'marketplace-expansion.updated',
  ROLLOUT_PROMOTED = 'marketplace-expansion.rollout_promoted',
  ROLLOUT_DEMOTED = 'marketplace-expansion.rollout_demoted',
  DEPRECATED = 'marketplace-expansion.deprecated',
  DISABLED = 'marketplace-expansion.disabled',
  COMPATIBILITY_VALIDATED = 'marketplace-expansion.compatibility_validated',
  COMPATIBILITY_FAILED = 'marketplace-expansion.compatibility_failed',
  CAPABILITY_UNSUPPORTED = 'marketplace-expansion.capability_unsupported',
  FALLBACK_USED = 'marketplace-expansion.fallback_used',
  CACHE_INVALIDATED = 'marketplace-expansion.cache_invalidated',
}

export enum ExpansionValidationIssueType {
  INVALID_EXPANSION = 'INVALID_EXPANSION',
  DUPLICATE_EXPANSION = 'DUPLICATE_EXPANSION',
  UNKNOWN_COUNTRY = 'UNKNOWN_COUNTRY',
  UNKNOWN_CURRENCY = 'UNKNOWN_CURRENCY',
  UNKNOWN_LOCALE = 'UNKNOWN_LOCALE',
  ADAPTER_NOT_REGISTERED = 'ADAPTER_NOT_REGISTERED',
  ADAPTER_INCOMPATIBLE = 'ADAPTER_INCOMPATIBLE',
}

// ── Core Entity ────────────────────────────────────────────────

export interface IMarketplaceExpansion {
  id: string;
  providerKey: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  rolloutState: MarketplaceRolloutState;
  version: number;
  apiVersionLabel?: string | null;
  countryCodes: string[];
  regionCodes: string[];
  currencyCodes: string[];
  localeCodes: string[];
  eligibilityScope: EligibilityScope;
  eligibleWorkspaceIds: string[];
  adapterCompatibilityStatus: AdapterCompatibilityStatus;
  compatibilityIssues: string[];
  backwardCompatibleApiVersions: string[];
  fallbackProviderKey?: string | null;
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

export interface IMarketplaceExpansionHistory {
  id: string;
  expansionId: string;
  version: number;
  rolloutState: MarketplaceRolloutState;
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

export interface MarketplaceExpansionFilterOptions {
  providerKey?: string | null;
  workspaceId?: string | null;
  organizationId?: string | null;
  rolloutState?: MarketplaceRolloutState | null;
  search?: string | null;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ── Cache ─────────────────────────────────────────────────────

export interface CachedExpansion {
  expansion: IMarketplaceExpansion;
  cachedAt: number;
}

export interface CachedExpansionSet {
  expansions: IMarketplaceExpansion[];
  cachedAt: number;
}

// ── Event Payload ─────────────────────────────────────────────

export interface MarketplaceExpansionEventPayload {
  event: MarketplaceExpansionEvent;
  expansionId?: string | null;
  providerKey?: string | null;
  workspaceId?: string | null;
  rolloutState?: string | null;
  changedBy?: string | null;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}
