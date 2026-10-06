// =============================================================
// Listing Engine – Interfaces & Types
// =============================================================

export enum ListingStatus {
  DRAFT = 'DRAFT',
  GENERATING = 'GENERATING',
  GENERATED = 'GENERATED',
  MANUALLY_EDITED = 'MANUALLY_EDITED',
  READY_FOR_APPROVAL = 'READY_FOR_APPROVAL',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
  ARCHIVED = 'ARCHIVED',
}

/** @deprecated Marketplace-hardcoded enum kept for backward compatibility only.
 *  New code should use marketplaceKey: string (dynamic, config-driven).
 */
export enum ListingMarketplace {
  AMAZON = 'AMAZON',
  EBAY = 'EBAY',
  SHOPIFY = 'SHOPIFY',
  WALMART = 'WALMART',
  ETSY = 'ETSY',
  CUSTOM = 'CUSTOM',
}

export enum ListingSection {
  TITLE = 'TITLE',
  BRAND = 'BRAND',
  CATEGORY = 'CATEGORY',
  DESCRIPTION = 'DESCRIPTION',
  BULLET_POINTS = 'BULLET_POINTS',
  IMAGES = 'IMAGES',
  VARIANTS = 'VARIANTS',
  ATTRIBUTES = 'ATTRIBUTES',
  SPECIFICATIONS = 'SPECIFICATIONS',
  SEARCH_TERMS = 'SEARCH_TERMS',
  PRICING = 'PRICING',
  SEO = 'SEO',
}

export enum ListingEvent {
  GENERATED = 'universal-listing-generated',
  UPDATED = 'universal-listing-updated',
  VALIDATED = 'universal-listing-validated',
  READY_FOR_APPROVAL = 'listing.ready-for-approval',
  APPROVED = 'listing.approved',
  PUBLISHED = 'listing.published',
  MARKETPLACE_GENERATED = 'marketplace-listing-generated',
  MARKETPLACE_TRANSFORMED = 'marketplace-listing-transformed',
  MARKETPLACE_VALIDATION_FAILED = 'marketplace-listing-validation-failed',
}

export enum MarketplaceListingStatus {
  PENDING_TRANSFORMATION = 'PENDING_TRANSFORMATION',
  TRANSFORMING = 'TRANSFORMING',
  TRANSFORMED = 'TRANSFORMED',
  VALIDATED = 'VALIDATED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  READY = 'READY',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
  ARCHIVED = 'ARCHIVED',
}

// ── Content Types ─────────────────────────────────────────────

export interface ListingImage {
  imageId: string;
  url: string;
  altText?: string | null;
  type: string;
  isPrimary: boolean;
  position: number;
  format?: string;
  fileSizeKb?: number;
  width?: number;
  height?: number;
}

export interface ListingVariant {
  variantId: string;
  sku: string;
  name: string;
  attributes: Record<string, string>;
  price?: number | null;
  compareAtPrice?: number | null;
  images?: string[];
  stockQty?: number | null;
}

export interface ListingPricing {
  sellingPrice: number;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  currency: string;
  marketplaceFeePercent?: number | null;
  estimatedProfit?: number | null;
}

export interface ListingSeoMetadata {
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  schema?: Record<string, unknown> | null;
}

export interface ListingContent {
  title?: string | null;
  brand?: string | null;
  category?: string | null;
  description?: string | null;
  bulletPoints?: string[];
  images?: ListingImage[];
  videos?: Array<{ videoId: string; url: string; type: string }>;
  variants?: ListingVariant[];
  attributes?: Record<string, string>;
  specifications?: Record<string, string>;
  searchTerms?: string[];
  pricing?: ListingPricing | null;
  seo?: ListingSeoMetadata | null;
}

export interface MissingAttribute {
  field: string;
  label: string;
  severity: 'REQUIRED' | 'RECOMMENDED';
}

export interface ListingValidationResult {
  isComplete: boolean;
  qualityScore: number;
  missingAttributes: MissingAttribute[];
  warnings: string[];
}

// ── Universal Listing ──────────────────────────────────────────

export interface IUniversalListing {
  id: string;
  workspaceId: string;
  catalogProductId: string;
  status: string;
  version: number;

  aiDescriptionId?: string | null;
  aiImageSetId?: string | null;
  aiSeoId?: string | null;
  templateId?: string | null;

  content: ListingContent;
  qualityScore?: number | null;
  validationResult?: ListingValidationResult | null;

  errorMessage?: string | null;
  failedAt?: Date | null;
  generationStartedAt?: Date | null;
  generationCompletedAt?: Date | null;

  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IUniversalListingHistory {
  id: string;
  universalListingId: string;
  workspaceId: string;
  fromStatus: string;
  toStatus: string;
  version: number;
  sectionsUpdated?: ListingSection[] | null;
  reason?: string | null;
  changedBy?: string | null;
  snapshotContent?: unknown;
  createdAt: Date;
}

// ── Marketplace Listing ────────────────────────────────────────

export interface IMarketplaceListing {
  id: string;
  workspaceId: string;
  universalListingId: string;
  catalogProductId: string;
  marketplaceKey: string;
  country: string;
  status: MarketplaceListingStatus;
  version: number;
  schemaId?: string | null;
  schemaVersion?: string | null;
  transformedPayload?: Record<string, unknown> | null;
  fieldTrace?: unknown[] | null;
  warnings?: unknown[] | null;
  errors?: unknown[] | null;
  readinessScore?: number | null;
  readinessStatus?: string | null;
  validationResult?: Record<string, unknown> | null;
  isDryRun: boolean;
  transformStartedAt?: Date | null;
  transformCompletedAt?: Date | null;
  failedAt?: Date | null;
  errorMessage?: string | null;
  externalListingId?: string | null;
  publishedAt?: Date | null;
  triggeredBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// ── Legacy IListing (backward compat) ─────────────────────────

export interface IListing {
  id: string;
  workspaceId: string;
  catalogProductId: string;
  marketplace: ListingMarketplace;
  status: ListingStatus;
  version: number;
  aiDescriptionId?: string | null;
  aiImageSetId?: string | null;
  aiSeoId?: string | null;
  templateId?: string | null;
  content: ListingContent;
  qualityScore?: number | null;
  validationResult?: ListingValidationResult | null;
  errorMessage?: string | null;
  failedAt?: Date | null;
  generationStartedAt?: Date | null;
  generationCompletedAt?: Date | null;
  externalListingId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IListingHistory {
  id: string;
  listingId: string;
  workspaceId: string;
  fromStatus: ListingStatus;
  toStatus: ListingStatus;
  version: number;
  sectionsUpdated?: ListingSection[];
  reason?: string | null;
  changedBy?: string | null;
  snapshotContent?: unknown;
  createdAt: Date;
}

// ── Job Payloads ─────────────────────────────────────────────

export interface ListingEventPayload {
  listingId: string;
  catalogProductId: string;
  workspaceId: string;
  marketplace: ListingMarketplace;
  event: ListingEvent;
  triggeredBy?: string;
  metadata?: Record<string, unknown>;
}

export interface ListingGenerationJobPayload {
  listingId: string;
  catalogProductId: string;
  workspaceId: string;
  marketplace: ListingMarketplace;
  sections: ListingSection[];
  templateId?: string;
  aiDescriptionId?: string;
  aiImageSetId?: string;
  aiSeoId?: string;
  isRegeneration: boolean;
  triggeredBy?: string;
}

export interface UniversalListingEventPayload {
  universalListingId: string;
  catalogProductId: string;
  workspaceId: string;
  event: ListingEvent;
  triggeredBy?: string;
  metadata?: Record<string, unknown>;
}

export interface UniversalListingGenerationJobPayload {
  universalListingId: string;
  catalogProductId: string;
  workspaceId: string;
  sections: ListingSection[];
  templateId?: string;
  aiDescriptionId?: string;
  aiImageSetId?: string;
  aiSeoId?: string;
  isRegeneration: boolean;
  triggeredBy?: string;
}

export interface MarketplaceListingTransformJobPayload {
  marketplaceListingId: string;
  universalListingId: string;
  catalogProductId: string;
  workspaceId: string;
  marketplaceKey: string;
  country: string;
  isDryRun: boolean;
  triggeredBy?: string;
}

