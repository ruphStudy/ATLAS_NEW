// =============================================================
// Regional Settings – Core Interfaces & Enums
//
// A composing layer over the Multi-Country Framework, Localization/
// Language Management, Currency Engine, Tax Engine, Organization Settings
// and User Preferences: one versioned, effective-dated profile per scope
// (global/country/region/organization/workspace) bundling regional
// formatting, operational calendars and provider-reference configuration.
// Every cross-module value is a plain reference resolved by its owning
// service — never recomputed or duplicated here.
// =============================================================

export enum RegionalSettingsScopeType {
  GLOBAL = 'GLOBAL',
  COUNTRY = 'COUNTRY',
  REGION = 'REGION',
  ORGANIZATION = 'ORGANIZATION',
  WORKSPACE = 'WORKSPACE',
}

export enum RegionalSettingsStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum RegionalSettingsEvent {
  PROFILE_CREATED = 'regional-settings.profile_created',
  PROFILE_UPDATED = 'regional-settings.profile_updated',
  PROFILE_PUBLISHED = 'regional-settings.profile_published',
  PROFILE_ARCHIVED = 'regional-settings.profile_archived',
  PROFILE_ROLLED_BACK = 'regional-settings.profile_rolled_back',
  CACHE_INVALIDATED = 'regional-settings.cache_invalidated',
  VALIDATION_FAILED = 'regional-settings.validation_failed',
}

export enum RegionalSettingsValidationIssueType {
  INVALID_PROFILE = 'INVALID_PROFILE',
  CONFLICTING_PROFILES = 'CONFLICTING_PROFILES',
  UNKNOWN_COUNTRY = 'UNKNOWN_COUNTRY',
  UNKNOWN_LOCALE = 'UNKNOWN_LOCALE',
  UNKNOWN_CURRENCY = 'UNKNOWN_CURRENCY',
  UNKNOWN_TAX_JURISDICTION = 'UNKNOWN_TAX_JURISDICTION',
  INCOMPATIBLE_COMBINATION = 'INCOMPATIBLE_COMBINATION',
}

// ── Core Entity ────────────────────────────────────────────────

export interface IRegionalSettingsProfile {
  id: string;
  key: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  scopeType: RegionalSettingsScopeType;
  countryCode?: string | null;
  regionCode?: string | null;
  localeCode?: string | null;
  languageCode?: string | null;
  currencyCode?: string | null;
  timezone?: string | null;
  dateFormat?: string | null;
  timeFormat?: string | null;
  numberFormat?: Record<string, unknown> | null;
  measurementSystem?: string | null;
  addressFormat?: Record<string, unknown> | null;
  taxJurisdictionCode?: string | null;
  complianceProfileKey?: string | null;
  marketplaceKeys: string[];
  supplierIds: string[];
  warehouseIds: string[];
  fulfillmentProviderKeys: string[];
  paymentProviderKeys: string[];
  workingDays: number[];
  businessHours: Record<string, unknown>;
  holidays: Array<{ date: string; name: string }>;
  pricingPreferences: Record<string, unknown>;
  shippingPreferences: Record<string, unknown>;
  fulfillmentPreferences: Record<string, unknown>;
  availabilityPreferences: Record<string, unknown>;
  priority: number;
  status: RegionalSettingsStatus;
  version: number;
  supersedesId?: string | null;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  metadata: Record<string, unknown>;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IRegionalSettingsProfileHistory {
  id: string;
  profileId: string;
  key: string;
  version: number;
  status: RegionalSettingsStatus;
  snapshot: Record<string, unknown>;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

// ── Resolution ────────────────────────────────────────────────

export interface IRegionalSettingsResolutionContext {
  workspaceId: string;
  organizationId?: string | null;
  countryCode?: string | null;
  regionCode?: string | null;
  userId?: string;
  effectiveDate?: Date | null;
}

/** The merged, effective regional profile for a context — every field's provenance (which profile supplied it) is preserved for traceability. */
export interface IEffectiveRegionalSettings {
  localeCode?: string | null;
  languageCode?: string | null;
  currencyCode?: string | null;
  timezone?: string | null;
  dateFormat?: string | null;
  timeFormat?: string | null;
  numberFormat?: Record<string, unknown> | null;
  measurementSystem?: string | null;
  addressFormat?: Record<string, unknown> | null;
  taxJurisdictionCode?: string | null;
  complianceProfileKey?: string | null;
  marketplaceKeys: string[];
  supplierIds: string[];
  warehouseIds: string[];
  fulfillmentProviderKeys: string[];
  paymentProviderKeys: string[];
  workingDays: number[];
  businessHours: Record<string, unknown>;
  holidays: Array<{ date: string; name: string }>;
  pricingPreferences: Record<string, unknown>;
  shippingPreferences: Record<string, unknown>;
  fulfillmentPreferences: Record<string, unknown>;
  availabilityPreferences: Record<string, unknown>;
  sources: Record<string, RegionalSettingsScopeType | 'LOCALIZATION_DEFAULT'>;
  contributingProfileIds: string[];
}

// ── Validation ────────────────────────────────────────────────

export interface IRegionalSettingsValidationIssue {
  type: RegionalSettingsValidationIssueType;
  message: string;
}

export interface IRegionalSettingsValidationResult {
  valid: boolean;
  issues: IRegionalSettingsValidationIssue[];
  warnings: string[];
}

// ── Filters ───────────────────────────────────────────────────

export interface RegionalSettingsProfileFilterOptions {
  key?: string | null;
  workspaceId?: string | null;
  organizationId?: string | null;
  scopeType?: RegionalSettingsScopeType | null;
  countryCode?: string | null;
  regionCode?: string | null;
  status?: RegionalSettingsStatus | null;
  search?: string | null;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ── Cache ─────────────────────────────────────────────────────

export interface CachedRegionalProfileSet {
  profiles: IRegionalSettingsProfile[];
  cachedAt: number;
}

export interface CachedEffectiveRegionalSettings {
  result: IEffectiveRegionalSettings;
  cachedAt: number;
}

// ── Event Payload ─────────────────────────────────────────────

export interface RegionalSettingsEventPayload {
  event: RegionalSettingsEvent;
  profileId?: string | null;
  key?: string | null;
  workspaceId?: string | null;
  countryCode?: string | null;
  regionCode?: string | null;
  changedBy?: string | null;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}
