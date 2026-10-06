// =============================================================
// Marketplace Listing Mapping Foundation – Interfaces & Types
// =============================================================

// ── Enums ─────────────────────────────────────────────────────

export enum MappingStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  DEPRECATED = 'DEPRECATED',
  ARCHIVED = 'ARCHIVED',
}

export enum CategoryMappingStatus {
  AUTO_MAPPED = 'AUTO_MAPPED',
  MANUALLY_MAPPED = 'MANUALLY_MAPPED',
  UNMAPPED = 'UNMAPPED',
  INVALID = 'INVALID',
}

export enum FieldType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  ENUM = 'ENUM',
  ARRAY = 'ARRAY',
  OBJECT = 'OBJECT',
  DATE = 'DATE',
  URL = 'URL',
  HTML = 'HTML',
}

export enum AttributeTransformType {
  DIRECT = 'DIRECT',
  RENAME = 'RENAME',
  VALUE_TRANSFORM = 'VALUE_TRANSFORM',
  UNIT_CONVERT = 'UNIT_CONVERT',
  ENUM_MAP = 'ENUM_MAP',
  DEFAULT_VALUE = 'DEFAULT_VALUE',
  CONDITIONAL = 'CONDITIONAL',
  DERIVED = 'DERIVED',
  REQUIRED_FALLBACK = 'REQUIRED_FALLBACK',
}

export enum VariantStructureType {
  PARENT_CHILD = 'PARENT_CHILD',
  STANDALONE = 'STANDALONE',
  MATRIX = 'MATRIX',
}

export enum ValidationSeverity {
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO',
}

export enum TransformationStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
}

export enum MarketplaceReadiness {
  READY = 'READY',
  WARNINGS = 'WARNINGS',
  NOT_READY = 'NOT_READY',
  INCOMPLETE = 'INCOMPLETE',
}

export enum MarketplaceMappingEvent {
  MAPPING_CREATED = 'marketplace-mapping-created',
  MAPPING_UPDATED = 'marketplace-mapping-updated',
  MAPPING_PUBLISHED = 'marketplace-mapping-published',
  MAPPING_FAILED = 'marketplace-mapping-failed',
  TRANSFORMATION_STARTED = 'listing-transformation-started',
  TRANSFORMATION_COMPLETED = 'listing-transformation-completed',
  TRANSFORMATION_FAILED = 'listing-transformation-failed',
  VALIDATION_COMPLETED = 'marketplace-validation-completed',
}

export enum TransformationSection {
  TITLE = 'TITLE',
  BRAND = 'BRAND',
  CATEGORY = 'CATEGORY',
  DESCRIPTION = 'DESCRIPTION',
  BULLET_POINTS = 'BULLET_POINTS',
  IMAGES = 'IMAGES',
  VIDEOS = 'VIDEOS',
  VARIANTS = 'VARIANTS',
  ATTRIBUTES = 'ATTRIBUTES',
  SPECIFICATIONS = 'SPECIFICATIONS',
  SEARCH_TERMS = 'SEARCH_TERMS',
  PRICING = 'PRICING',
  COMPLIANCE = 'COMPLIANCE',
  DIMENSIONS = 'DIMENSIONS',
  WEIGHT = 'WEIGHT',
  PACKAGING = 'PACKAGING',
}

// ── Universal Input ───────────────────────────────────────────

export interface UniversalListingInput {
  listingId: string;
  workspaceId: string;
  catalogProductId: string;
  product?: IUniversalProduct | null;
  brand?: string | null;
  category?: string | null;
  title?: string | null;
  description?: string | null;
  bulletPoints?: string[];
  images?: IUniversalImage[];
  videos?: IUniversalVideo[];
  variants?: IUniversalVariant[];
  attributes?: Record<string, unknown>;
  specifications?: Record<string, unknown>;
  searchTerms?: string[];
  seoMetadata?: IUniversalSeoMetadata | null;
  pricingReference?: IUniversalPricing | null;
  compliance?: IUniversalCompliance | null;
  dimensions?: IUniversalDimensions | null;
  weight?: IUniversalWeight | null;
  packaging?: IUniversalPackaging | null;
  inventoryReference?: IUniversalInventory | null;
}

export interface IUniversalProduct {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
}

export interface IUniversalImage {
  id: string;
  url: string;
  altText?: string | null;
  isPrimary: boolean;
  position: number;
  width?: number | null;
  height?: number | null;
  format?: string | null;
  fileSizeKb?: number | null;
  variantId?: string | null;
}

export interface IUniversalVideo {
  id: string;
  url: string;
  title?: string | null;
  durationSeconds?: number | null;
}

export interface IUniversalVariant {
  id: string;
  sku: string;
  name: string;
  attributes: Record<string, string>;
  price?: number | null;
  compareAtPrice?: number | null;
  imageIds?: string[];
  stockQty?: number | null;
}

export interface IUniversalSeoMetadata {
  metaTitle?: string | null;
  metaDescription?: string | null;
  keywords?: string[];
  canonicalUrl?: string | null;
}

export interface IUniversalPricing {
  sellingPrice: number;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  currency: string;
  taxCode?: string | null;
}

export interface IUniversalCompliance {
  certifications?: string[];
  restrictions?: string[];
  hazmatCategory?: string | null;
  countryOfOrigin?: string | null;
}

export interface IUniversalDimensions {
  length: number;
  width: number;
  height: number;
  unit: string;
}

export interface IUniversalWeight {
  value: number;
  unit: string;
}

export interface IUniversalPackaging {
  type?: string | null;
  unitsPerPack?: number | null;
}

export interface IUniversalInventory {
  stockQty: number;
  warehouseId?: string | null;
  fulfillmentType?: string | null;
}

// ── Schema Definition ─────────────────────────────────────────

export interface FieldCondition {
  field: string;
  operator: 'eq' | 'neq' | 'in' | 'nin' | 'exists' | 'not_exists';
  value?: unknown;
}

export interface MarketplaceFieldDefinition {
  name: string;
  mappedFrom?: string | null;
  type: FieldType;
  label: string;
  required: boolean;
  maxLength?: number | null;
  minLength?: number | null;
  minValue?: number | null;
  maxValue?: number | null;
  allowedValues?: string[] | null;
  defaultValue?: unknown;
  description?: string | null;
  conditions?: FieldCondition[] | null;
}

export interface MarketplaceMediaRequirements {
  primaryImage: boolean;
  minImages: number;
  maxImages: number;
  allowedFormats: string[];
  maxFileSizeKb: number;
  minWidth: number;
  minHeight: number;
  maxWidth?: number | null;
  maxHeight?: number | null;
  requireWhiteBackground?: boolean | null;
  allowedAspectRatios?: string[] | null;
  videoAllowed: boolean;
  maxVideos?: number | null;
  altTextRequired: boolean;
  variantImagesAllowed: boolean;
}

export interface MarketplaceVariantRules {
  supported: boolean;
  structure: VariantStructureType;
  maxVariants: number;
  allowedThemes: string[];
  requiresParentSku: boolean;
  maxAttributesPerVariant: number;
}

export interface MarketplaceContentRules {
  maxTitleLength: number;
  titleFormat?: string | null;
  maxBulletPoints: number;
  maxBulletLength: number;
  maxDescriptionLength: number;
  htmlInDescription: boolean;
  maxSearchTerms: number;
  maxSearchTermLength: number;
  restrictedWords?: string[] | null;
  prohibitedClaims?: string[] | null;
  allowCapitalization: boolean;
  allowPromotionalText: boolean;
  allowSpecialChars: boolean;
  brandInTitle: boolean;
  locale?: string | null;
}

export interface MarketplacePricingRequirements {
  required: boolean;
  allowedCurrencies: string[];
  minPrice?: number | null;
  maxPrice?: number | null;
  requiresCompareAtPrice: boolean;
  requiresShippingPrice: boolean;
}

export interface IMarketplaceSchema {
  id: string;
  workspaceId?: string | null;
  marketplaceKey: string;
  country: string;
  region?: string | null;
  locale: string;
  currency: string;
  category?: string | null;
  schemaVersion: string;
  status: MappingStatus;
  isDefault: boolean;
  requiredFields: MarketplaceFieldDefinition[];
  optionalFields: MarketplaceFieldDefinition[];
  mediaRequirements: MarketplaceMediaRequirements;
  variantRules: MarketplaceVariantRules;
  contentRules: MarketplaceContentRules;
  pricingRequirements: MarketplacePricingRequirements;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  createdBy?: string | null;
  approvedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// ── Category Mapping ──────────────────────────────────────────

export interface ICategoryMapping {
  id: string;
  workspaceId?: string | null;
  schemaId?: string | null;
  universalCategory: string;
  marketplaceKey: string;
  country: string;
  marketplaceCategory: string;
  marketplaceCategoryId?: string | null;
  categoryPath?: string | null;
  confidence: number;
  status: CategoryMappingStatus;
  isManualOverride: boolean;
  version: number;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolvedCategoryMapping {
  marketplaceCategory: string;
  marketplaceCategoryId?: string | null;
  categoryPath?: string | null;
  confidence: number;
  status: CategoryMappingStatus;
  source: 'workspace' | 'global' | 'missing';
}

// ── Attribute Mapping ─────────────────────────────────────────

export interface IUnitConversion {
  fromUnit: string;
  toUnit: string;
  factor: number;
  offset?: number | null;
}

export interface IAttributeMapping {
  id: string;
  workspaceId?: string | null;
  schemaId?: string | null;
  marketplaceKey: string;
  country: string;
  universalAttribute: string;
  marketplaceAttribute: string;
  transformType: AttributeTransformType;
  valueMapping?: Record<string, unknown> | null;
  unitConversion?: IUnitConversion | null;
  defaultValue?: unknown;
  isRequired: boolean;
  isManualOverride: boolean;
  conditions?: FieldCondition[] | null;
  derivedExpression?: string | null;
  version: number;
  status: MappingStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolvedAttributeValue {
  marketplaceAttribute: string;
  value: unknown;
  transformType: AttributeTransformType;
  sourceAttribute: string;
  originalValue: unknown;
  usedDefault: boolean;
}

// ── Mapping Config ────────────────────────────────────────────

export interface IMarketplaceMappingConfig {
  id: string;
  workspaceId: string;
  marketplaceKey: string;
  country: string;
  category?: string | null;
  schemaVersion: string;
  status: MappingStatus;
  mappingVersion: number;
  isDefault: boolean;
  overrides?: Record<string, unknown> | null;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  publishedAt?: Date | null;
  publishedBy?: string | null;
  approvedBy?: string | null;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IMarketplaceMappingVersionHistory {
  id: string;
  configId: string;
  workspaceId: string;
  mappingVersion: number;
  schemaVersion: string;
  status: MappingStatus;
  overrides?: Record<string, unknown> | null;
  changeNote?: string | null;
  createdBy?: string | null;
  approvedBy?: string | null;
  effectiveFrom?: Date | null;
  createdAt: Date;
}

// ── Transformation ────────────────────────────────────────────

export interface FieldTrace {
  marketplaceField: string;
  universalSource: string;
  transformType: string;
  originalValue: unknown;
  transformedValue: unknown;
  section: TransformationSection;
}

export interface TransformationIssue {
  field: string;
  code: string;
  message: string;
  severity: ValidationSeverity;
  section?: TransformationSection | null;
}

export interface TransformationResult {
  jobId?: string | null;
  listingId: string;
  workspaceId: string;
  marketplaceKey: string;
  country: string;
  schemaVersion: string;
  status: TransformationStatus;
  payload: Record<string, unknown>;
  fieldTrace: FieldTrace[];
  warnings: TransformationIssue[];
  errors: TransformationIssue[];
  isDryRun: boolean;
  sectionsTransformed: TransformationSection[];
  transformedAt: Date;
}

export interface TransformationOptions {
  dryRun?: boolean;
  sections?: TransformationSection[];
  workspaceOverrides?: Record<string, unknown>;
  skipValidation?: boolean;
  triggeredBy?: string;
}

// ── Validation ────────────────────────────────────────────────

export interface ValidationIssue {
  field: string;
  code: string;
  message: string;
  severity: ValidationSeverity;
  area?: string | null;
}

export interface MissingFieldInfo {
  field: string;
  label: string;
  required: boolean;
  area?: string | null;
}

export interface InvalidFieldInfo {
  field: string;
  value: unknown;
  reason: string;
}

export interface MarketplaceValidationResult {
  isValid: boolean;
  readinessScore: number;
  readinessStatus: MarketplaceReadiness;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  missingFields: MissingFieldInfo[];
  invalidFields: InvalidFieldInfo[];
  unsupportedFields: string[];
}

// ── Variant Mapping ───────────────────────────────────────────

export interface MappedVariant {
  parentSku?: string | null;
  childSku: string;
  name: string;
  variationTheme?: string | null;
  attributes: Record<string, string>;
  price?: number | null;
  compareAtPrice?: number | null;
  imageUrls?: string[];
  stockQty?: number | null;
  position: number;
}

export interface VariantMappingResult {
  structure: VariantStructureType;
  parentRecord?: Record<string, unknown> | null;
  variants: MappedVariant[];
  warnings: TransformationIssue[];
}

// ── Media Mapping ─────────────────────────────────────────────

export interface MappedImage {
  url: string;
  altText?: string | null;
  isPrimary: boolean;
  position: number;
  variantId?: string | null;
}

export interface MediaMappingResult {
  images: MappedImage[];
  videos: IUniversalVideo[];
  warnings: TransformationIssue[];
  errors: TransformationIssue[];
}

// ── Job Payloads ──────────────────────────────────────────────

export interface TransformationJobPayload {
  jobId: string;
  listingId: string;
  workspaceId: string;
  catalogProductId: string;
  marketplaceKey: string;
  country: string;
  schemaVersion: string;
  isDryRun: boolean;
  sections?: TransformationSection[];
  workspaceOverrides?: Record<string, unknown>;
  triggeredBy?: string;
}

export interface MappingEventPayload {
  entityId: string;
  workspaceId: string;
  marketplaceKey: string;
  event: MarketplaceMappingEvent;
  triggeredBy?: string;
  metadata?: Record<string, unknown>;
}

// ── Registry ──────────────────────────────────────────────────

export interface IMarketplaceMappingAdapter {
  readonly marketplaceKey: string;
  getDefaultSchema(country: string, category?: string): Partial<IMarketplaceSchema>;
  getDefaultContentRules(country: string): MarketplaceContentRules;
  getDefaultMediaRequirements(country: string): MarketplaceMediaRequirements;
  getDefaultVariantRules(): MarketplaceVariantRules;
}
