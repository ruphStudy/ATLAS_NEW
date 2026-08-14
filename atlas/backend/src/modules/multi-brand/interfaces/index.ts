// =============================================================
// Multi-Brand Management – Core Interfaces & Enums
//
// A workspace/organization can own several brands. Brand identity,
// lifecycle and scope (countries/regions/currencies/marketplace accounts/
// locale/tax/compliance) live here as plain references — every
// cross-module value is resolved by its owning service (Product Catalog,
// Marketplace, Pricing, Localization, Regional Settings, Currency Engine,
// Tax Engine) and never recomputed or duplicated. Products/categories/
// listings/media are associated generically via `BrandEntityLink`,
// mirroring the existing `DocumentEntityLink` pattern — no catalog schema
// is touched.
// =============================================================

export enum BrandStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum BrandEvent {
  BRAND_CREATED = 'multi-brand.brand_created',
  BRAND_UPDATED = 'multi-brand.brand_updated',
  BRAND_ACTIVATED = 'multi-brand.brand_activated',
  BRAND_DEACTIVATED = 'multi-brand.brand_deactivated',
  BRAND_ARCHIVED = 'multi-brand.brand_archived',
  BRAND_RESTORED = 'multi-brand.brand_restored',
  DEFAULT_BRAND_CHANGED = 'multi-brand.default_brand_changed',
  OWNERSHIP_CHANGED = 'multi-brand.ownership_changed',
  ENTITY_LINKED = 'multi-brand.entity_linked',
  ENTITY_UNLINKED = 'multi-brand.entity_unlinked',
  CACHE_INVALIDATED = 'multi-brand.cache_invalidated',
  VALIDATION_FAILED = 'multi-brand.validation_failed',
}

export enum BrandValidationIssueType {
  INVALID_BRAND = 'INVALID_BRAND',
  DUPLICATE_CODE = 'DUPLICATE_CODE',
  UNKNOWN_WORKSPACE = 'UNKNOWN_WORKSPACE',
  UNKNOWN_CURRENCY = 'UNKNOWN_CURRENCY',
  UNKNOWN_MARKETPLACE_ACCOUNT = 'UNKNOWN_MARKETPLACE_ACCOUNT',
  INVALID_CROSS_BRAND_ASSIGNMENT = 'INVALID_CROSS_BRAND_ASSIGNMENT',
}

// ── Core Entity ────────────────────────────────────────────────

export interface IBrand {
  id: string;
  workspaceId: string;
  organizationId?: string | null;
  code: string;
  name: string;
  legalOwner?: string | null;
  logoUrl?: string | null;
  domains: string[];
  description?: string | null;
  status: BrandStatus;
  version: number;
  isDefault: boolean;
  priority: number;
  countryCodes: string[];
  regionCodes: string[];
  currencyCodes: string[];
  marketplaceAccountIds: string[];
  localeCode?: string | null;
  regionalSettingsProfileKey?: string | null;
  taxJurisdictionCode?: string | null;
  complianceProfileKey?: string | null;
  fulfillmentPreferences: Record<string, unknown>;
  seoDefaults: Record<string, unknown>;
  settings: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IBrandHistory {
  id: string;
  brandId: string;
  version: number;
  status: BrandStatus;
  snapshot: Record<string, unknown>;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export interface IBrandEntityLink {
  id: string;
  brandId: string;
  workspaceId: string;
  entityType: string;
  entityId: string;
  isShared: boolean;
  isPrimary: boolean;
  linkedBy?: string | null;
  createdAt: Date;
}

// ── Validation ────────────────────────────────────────────────

export interface IBrandValidationIssue {
  type: BrandValidationIssueType;
  message: string;
}

export interface IBrandValidationResult {
  valid: boolean;
  issues: IBrandValidationIssue[];
  warnings: string[];
}

// ── Filters ───────────────────────────────────────────────────

export interface BrandFilterOptions {
  workspaceId?: string | null;
  organizationId?: string | null;
  code?: string | null;
  status?: BrandStatus | null;
  countryCode?: string | null;
  search?: string | null;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface BrandEntityLinkFilterOptions {
  brandId?: string | null;
  workspaceId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
}

// ── Cache ─────────────────────────────────────────────────────

export interface CachedBrandSet {
  brands: IBrand[];
  cachedAt: number;
}

export interface CachedBrand {
  brand: IBrand;
  cachedAt: number;
}

// ── Event Payload ─────────────────────────────────────────────

export interface BrandEventPayload {
  event: BrandEvent;
  brandId?: string | null;
  code?: string | null;
  workspaceId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  changedBy?: string | null;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}
