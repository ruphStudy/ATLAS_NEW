// =============================================================
// Multi-Business Management – Core Interfaces & Enums
//
// One organization can operate several legal/business units, each with
// its own workspaces, brands, warehouses, marketplace accounts, suppliers
// and financial settings, plus parent-child hierarchy. Every cross-module
// value is a plain reference resolved by its owning service (Workspace,
// Multi-Brand, Warehouse, Suppliers, Country, Currency Engine, Regional
// Settings, Tax Engine, Billing Engine) — never recomputed or duplicated.
// =============================================================

export enum BusinessStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  ARCHIVED = 'ARCHIVED',
}

export enum BusinessVisibilityScope {
  ORGANIZATION = 'ORGANIZATION',
  BUSINESS = 'BUSINESS',
  PRIVATE = 'PRIVATE',
}

export enum BusinessEvent {
  BUSINESS_CREATED = 'multi-business.business_created',
  BUSINESS_UPDATED = 'multi-business.business_updated',
  BUSINESS_ACTIVATED = 'multi-business.business_activated',
  BUSINESS_SUSPENDED = 'multi-business.business_suspended',
  BUSINESS_ARCHIVED = 'multi-business.business_archived',
  BUSINESS_RESTORED = 'multi-business.business_restored',
  DEFAULT_BUSINESS_CHANGED = 'multi-business.default_business_changed',
  OWNERSHIP_CHANGED = 'multi-business.ownership_changed',
  HIERARCHY_CHANGED = 'multi-business.hierarchy_changed',
  ENTITY_LINKED = 'multi-business.entity_linked',
  ENTITY_UNLINKED = 'multi-business.entity_unlinked',
  CACHE_INVALIDATED = 'multi-business.cache_invalidated',
  VALIDATION_FAILED = 'multi-business.validation_failed',
}

export enum BusinessValidationIssueType {
  INVALID_BUSINESS = 'INVALID_BUSINESS',
  DUPLICATE_LEGAL_IDENTITY = 'DUPLICATE_LEGAL_IDENTITY',
  UNKNOWN_COUNTRY = 'UNKNOWN_COUNTRY',
  UNKNOWN_CURRENCY = 'UNKNOWN_CURRENCY',
  UNKNOWN_WORKSPACE = 'UNKNOWN_WORKSPACE',
  UNKNOWN_BRAND = 'UNKNOWN_BRAND',
  UNKNOWN_WAREHOUSE = 'UNKNOWN_WAREHOUSE',
  UNKNOWN_SUPPLIER = 'UNKNOWN_SUPPLIER',
  HIERARCHY_CYCLE = 'HIERARCHY_CYCLE',
  INVALID_CROSS_BUSINESS_ASSIGNMENT = 'INVALID_CROSS_BUSINESS_ASSIGNMENT',
}

// ── Core Entity ────────────────────────────────────────────────

export interface IBusinessContact {
  name: string;
  email?: string;
  phone?: string;
  role?: string;
}

export interface IBusiness {
  id: string;
  organizationId?: string | null;
  workspaceId: string;
  parentBusinessId?: string | null;
  code: string;
  name: string;
  legalName?: string | null;
  businessType?: string | null;
  registrationNumber?: string | null;
  taxIdentifier?: string | null;
  countryCode?: string | null;
  regionCode?: string | null;
  currencyCode?: string | null;
  timezone?: string | null;
  contacts: IBusinessContact[];
  status: BusinessStatus;
  version: number;
  isDefault: boolean;
  priority: number;
  visibilityScope: BusinessVisibilityScope;
  workspaceIds: string[];
  brandIds: string[];
  warehouseIds: string[];
  marketplaceAccountIds: string[];
  supplierIds: string[];
  regionalSettingsProfileKey?: string | null;
  taxJurisdictionCode?: string | null;
  complianceProfileKey?: string | null;
  billingAccountRef?: string | null;
  settings: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IBusinessHistory {
  id: string;
  businessId: string;
  version: number;
  status: BusinessStatus;
  snapshot: Record<string, unknown>;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export interface IBusinessEntityLink {
  id: string;
  businessId: string;
  workspaceId: string;
  entityType: string;
  entityId: string;
  isShared: boolean;
  isPrimary: boolean;
  linkedBy?: string | null;
  createdAt: Date;
}

// ── Validation ────────────────────────────────────────────────

export interface IBusinessValidationIssue {
  type: BusinessValidationIssueType;
  message: string;
}

export interface IBusinessValidationResult {
  valid: boolean;
  issues: IBusinessValidationIssue[];
  warnings: string[];
}

// ── Filters ───────────────────────────────────────────────────

export interface BusinessFilterOptions {
  organizationId?: string | null;
  workspaceId?: string | null;
  parentBusinessId?: string | null;
  code?: string | null;
  status?: BusinessStatus | null;
  countryCode?: string | null;
  search?: string | null;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface BusinessEntityLinkFilterOptions {
  businessId?: string | null;
  workspaceId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
}

// ── Cache ─────────────────────────────────────────────────────

export interface CachedBusinessSet {
  businesses: IBusiness[];
  cachedAt: number;
}

export interface CachedBusiness {
  business: IBusiness;
  cachedAt: number;
}

// ── Event Payload ─────────────────────────────────────────────

export interface BusinessEventPayload {
  event: BusinessEvent;
  businessId?: string | null;
  code?: string | null;
  workspaceId?: string | null;
  organizationId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  changedBy?: string | null;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}
