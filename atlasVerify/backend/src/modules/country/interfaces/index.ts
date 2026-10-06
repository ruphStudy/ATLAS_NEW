// =============================================================
// Multi-Country Framework – Core Interfaces & Enums
// =============================================================

import { MarketplaceCapability, MarketplaceKey } from '../../marketplace-provider/interfaces';

// ── Re-export foundation enums ───────────────────────────────────

export { MarketplaceCapability, MarketplaceKey } from '../../marketplace-provider/interfaces';

// ── Country Status ──────────────────────────────────────────────

export enum CountryStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  DEPRECATED = 'DEPRECATED',
  ARCHIVED = 'ARCHIVED',
}

// ── Resolution Status ────────────────────────────────────────────

export enum CountryResolutionStatus {
  RESOLVED = 'RESOLVED',
  NOT_REGISTERED = 'NOT_REGISTERED',
  DISABLED = 'DISABLED',
  NOT_ENABLED_FOR_WORKSPACE = 'NOT_ENABLED_FOR_WORKSPACE',
  FALLBACK_APPLIED = 'FALLBACK_APPLIED',
}

// ── Override Type ────────────────────────────────────────────────

export enum CountryOverrideType {
  GLOBAL = 'GLOBAL',
  ORGANIZATION = 'ORGANIZATION',
  WORKSPACE = 'WORKSPACE',
}

// ── Provider Availability Domain ─────────────────────────────────

/**
 * Cross-cutting category label for country-specific availability records.
 * Purely a scoping tag — the actual provider registries (marketplace,
 * supplier, warehouse, fulfillment, payment, AI) remain the single source
 * of truth for what a `providerKey` is and does; nothing here re-implements
 * or hardcodes per-provider behavior.
 */
export enum CountryProviderDomain {
  MARKETPLACE = 'MARKETPLACE',
  SUPPLIER = 'SUPPLIER',
  WAREHOUSE = 'WAREHOUSE',
  FULFILLMENT = 'FULFILLMENT',
  PAYMENT = 'PAYMENT',
  AI_PROVIDER = 'AI_PROVIDER',
}

// ── Events ────────────────────────────────────────────────────────

export enum CountryEvent {
  REGISTERED = 'country-registered',
  UPDATED = 'country-updated',
  ENABLED = 'country-enabled',
  DISABLED = 'country-disabled',
  DEPRECATED = 'country-deprecated',
  ARCHIVED = 'country-archived',
  RESTORED = 'country-restored',
  CONFIGURED = 'country-configured',
  DEFAULT_CHANGED = 'country-default-changed',
  OVERRIDE_CREATED = 'country-override-created',
  PROVIDER_AVAILABILITY_CONFIGURED = 'country-provider-availability-configured',
  CONTEXT_RESOLVED = 'country-context-resolved',
  CACHE_INVALIDATED = 'country-cache-invalidated',
  VALIDATION_FAILED = 'country-validation-failed',
}

// ── Validation Issue Type ────────────────────────────────────────

export enum CountryValidationIssueType {
  DUPLICATE_CODE = 'DUPLICATE_CODE',
  COUNTRY_NOT_SUPPORTED = 'COUNTRY_NOT_SUPPORTED',
  PROVIDER_NOT_SUPPORTED = 'PROVIDER_NOT_SUPPORTED',
  MARKETPLACE_NOT_SUPPORTED = 'MARKETPLACE_NOT_SUPPORTED',
  PROVIDER_DOMAIN_UNAVAILABLE = 'PROVIDER_DOMAIN_UNAVAILABLE',
  CURRENCY_MISMATCH = 'CURRENCY_MISMATCH',
  LOCALE_NOT_SUPPORTED = 'LOCALE_NOT_SUPPORTED',
  TAX_REGIME_MISSING = 'TAX_REGIME_MISSING',
  FEATURE_NOT_SUPPORTED = 'FEATURE_NOT_SUPPORTED',
  INVALID_DEPENDENCY = 'INVALID_DEPENDENCY',
}

// ── Core Entities ─────────────────────────────────────────────────

export interface ICountry {
  id: string;
  code: string;
  name: string;
  region?: string | null;
  timezone: string;
  locale: string;
  currency: string;
  language: string;
  supportedLocales: string[];
  supportedCurrencies: string[];
  supportedLanguages: string[];
  taxRegime?: string | null;
  complianceRefs: string[];
  businessRules: Record<string, unknown>;
  status: CountryStatus;
  version: number;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  metadata: Record<string, unknown>;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface ICountryHistory {
  id: string;
  countryId: string;
  code: string;
  version: number;
  status: CountryStatus;
  snapshot: Record<string, unknown>;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export interface IWorkspaceCountryConfig {
  id: string;
  workspaceId: string;
  organizationId?: string | null;
  countryCode: string;
  isEnabled: boolean;
  isDefault: boolean;
  isPreferred: boolean;
  priority: number;
  fallbackCountryCode?: string | null;
  configuration: Record<string, unknown>;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface ICountryProviderAvailability {
  id: string;
  countryCode: string;
  domain: CountryProviderDomain;
  providerKey: string;
  workspaceId?: string | null;
  isAvailable: boolean;
  status: string;
  metadata: Record<string, unknown>;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface ICountryOverride {
  id: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  countryCode: string;
  overrideType: CountryOverrideType;
  overrideValue: Record<string, unknown>;
  priority: number;
  reason?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// ── Resolution ────────────────────────────────────────────────────

export interface CountryResolutionRequest {
  workspaceId: string;
  organizationId?: string | null;
  countryCode?: string | null;
}

export interface CountryContext {
  code: string;
  name: string;
  region?: string | null;
  timezone: string;
  locale: string;
  currency: string;
  language: string;
  supportedLocales: string[];
  supportedCurrencies: string[];
  supportedLanguages: string[];
  taxRegime?: string | null;
  complianceRefs: string[];
  businessRules: Record<string, unknown>;
  isDefault: boolean;
  isPreferred: boolean;
  configuration: Record<string, unknown>;
  overrides: Record<string, unknown>;
}

export interface CountryResolutionResult {
  status: CountryResolutionStatus;
  workspaceId: string;
  requestedCountryCode?: string | null;
  context: CountryContext | null;
  reasons: string[];
  resolvedAt: Date;
  resolutionTimeMs: number;
}

// ── Validation ────────────────────────────────────────────────────

export interface CountryValidationRequest {
  workspaceId: string;
  countryCode: string;
  providerKey?: string | null;
  marketplaceKey?: MarketplaceKey | null;
  capability?: MarketplaceCapability | null;
  currency?: string | null;
  locale?: string | null;
  providerDomain?: CountryProviderDomain | null;
  featureFlags?: Record<string, boolean>;
}

export interface CountryValidationIssue {
  type: CountryValidationIssueType;
  message: string;
}

export interface CountryValidationResult {
  valid: boolean;
  issues: CountryValidationIssue[];
  warnings: string[];
}

// ── Filters ───────────────────────────────────────────────────────

export interface CountryFilterOptions {
  code?: string | null;
  region?: string | null;
  status?: CountryStatus | null;
  search?: string | null;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CountryProviderAvailabilityFilter {
  domain?: CountryProviderDomain | null;
  providerKey?: string | null;
  workspaceId?: string | null;
}

// ── Cache Entries ─────────────────────────────────────────────────

export interface CachedCountry {
  country: ICountry;
  cachedAt: number;
}

export interface CachedCountryResolution {
  result: CountryResolutionResult;
  cachedAt: number;
}

// ── Event Payload ─────────────────────────────────────────────────

export interface CountryEventPayload {
  event: CountryEvent;
  countryCode: string;
  workspaceId?: string | null;
  version?: number | null;
  changedBy?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}
