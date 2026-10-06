import { ListingStatus, ListingSection, ListingMarketplace } from '../interfaces';

/**
 * LISTING_CONSTANTS
 *
 * Marketplace-specific rules (REQUIRED_FIELDS, RECOMMENDED_FIELDS, TITLE_LIMITS)
 * are intentionally left as static defaults here for universal listing quality scoring.
 * All marketplace-specific transformations are delegated to the
 * Marketplace Listing Mapping Foundation (MarketplaceMappingFactory).
 */
export const LISTING_CONSTANTS = {
  // Universal quality weights — marketplace-agnostic
  QUALITY_WEIGHTS: {
    TITLE: 15,
    BRAND: 5,
    CATEGORY: 5,
    DESCRIPTION: 20,
    BULLET_POINTS: 15,
    IMAGES: 15,
    PRICING: 10,
    SEARCH_TERMS: 5,
    SEO: 5,
    VARIANTS: 3,
    ATTRIBUTES: 1,
    SPECIFICATIONS: 1,
  } as Record<string, number>,

  // Universal required fields (for quality scoring, not marketplace-specific)
  UNIVERSAL_REQUIRED_FIELDS: [
    'title', 'brand', 'category', 'description', 'images', 'pricing',
  ] as string[],

  // Universal recommended fields
  UNIVERSAL_RECOMMENDED_FIELDS: [
    'bulletPoints', 'searchTerms', 'variants', 'attributes', 'specifications', 'seo',
  ] as string[],

  ALLOWED_TRANSITIONS: {
    [ListingStatus.DRAFT]: [ListingStatus.GENERATING, ListingStatus.ARCHIVED],
    [ListingStatus.GENERATING]: [ListingStatus.GENERATED, ListingStatus.FAILED],
    [ListingStatus.GENERATED]: [
      ListingStatus.MANUALLY_EDITED,
      ListingStatus.READY_FOR_APPROVAL,
      ListingStatus.GENERATING,
      ListingStatus.ARCHIVED,
    ],
    [ListingStatus.MANUALLY_EDITED]: [
      ListingStatus.READY_FOR_APPROVAL,
      ListingStatus.GENERATING,
      ListingStatus.ARCHIVED,
    ],
    [ListingStatus.READY_FOR_APPROVAL]: [
      ListingStatus.APPROVED,
      ListingStatus.MANUALLY_EDITED,
      ListingStatus.GENERATING,
    ],
    [ListingStatus.APPROVED]: [
      ListingStatus.PUBLISHED,
      ListingStatus.MANUALLY_EDITED,
      ListingStatus.GENERATING,
    ],
    [ListingStatus.PUBLISHED]: [ListingStatus.ARCHIVED, ListingStatus.MANUALLY_EDITED],
    [ListingStatus.FAILED]: [ListingStatus.GENERATING, ListingStatus.ARCHIVED],
    [ListingStatus.ARCHIVED]: [],
  } as Record<ListingStatus, ListingStatus[]>,

  ALL_SECTIONS: Object.values(ListingSection),

  // Default universal title limit (marketplace limits come from Marketplace Listing Mapping Foundation)
  DEFAULT_TITLE_LIMIT: 500,

  // Mandatory fields per marketplace
  REQUIRED_FIELDS: {
    [ListingMarketplace.AMAZON]: ['title', 'brand', 'category', 'description', 'bulletPoints', 'images', 'pricing'],
    [ListingMarketplace.EBAY]: ['title', 'description', 'images', 'pricing', 'category'],
    [ListingMarketplace.SHOPIFY]: ['title', 'description', 'images', 'pricing'],
    [ListingMarketplace.WALMART]: ['title', 'brand', 'category', 'description', 'images', 'pricing'],
    [ListingMarketplace.ETSY]: ['title', 'description', 'images', 'pricing', 'searchTerms'],
    [ListingMarketplace.CUSTOM]: ['title', 'description', 'pricing'],
  } as Record<ListingMarketplace, string[]>,

  RECOMMENDED_FIELDS: {
    [ListingMarketplace.AMAZON]: ['variants', 'attributes', 'specifications', 'searchTerms'],
    [ListingMarketplace.EBAY]: ['brand', 'variants', 'attributes', 'specifications'],
    [ListingMarketplace.SHOPIFY]: ['brand', 'category', 'variants', 'attributes', 'searchTerms'],
    [ListingMarketplace.WALMART]: ['bulletPoints', 'variants', 'specifications', 'searchTerms'],
    [ListingMarketplace.ETSY]: ['brand', 'bulletPoints', 'attributes', 'specifications'],
    [ListingMarketplace.CUSTOM]: ['brand', 'category', 'bulletPoints', 'images', 'variants'],
  } as Record<ListingMarketplace, string[]>,

  MARKETPLACE_TITLE_LIMITS: {
    [ListingMarketplace.AMAZON]: 200,
    [ListingMarketplace.EBAY]: 80,
    [ListingMarketplace.SHOPIFY]: 255,
    [ListingMarketplace.WALMART]: 75,
    [ListingMarketplace.ETSY]: 140,
    [ListingMarketplace.CUSTOM]: 500,
  } as Record<ListingMarketplace, number>,
} as const;

export const LISTING_GENERATION_QUEUE_CONFIG = {
  ATTEMPTS: 2,
  BACKOFF_DELAY_MS: 10_000,
  REMOVE_ON_COMPLETE_COUNT: 30,
  REMOVE_ON_FAIL_COUNT: 20,
} as const;

export const LISTING_EVENT_QUEUE_CONFIG = {
  ATTEMPTS: 3,
  BACKOFF_DELAY_MS: 5_000,
  REMOVE_ON_COMPLETE_COUNT: 50,
  REMOVE_ON_FAIL_COUNT: 20,
} as const;

export const MARKETPLACE_LISTING_TRANSFORMATION_QUEUE_CONFIG = {
  ATTEMPTS: 3,
  BACKOFF_DELAY_MS: 8_000,
  REMOVE_ON_COMPLETE_COUNT: 50,
  REMOVE_ON_FAIL_COUNT: 30,
} as const;

export const MARKETPLACE_LISTING_EVENTS_QUEUE_CONFIG = {
  ATTEMPTS: 3,
  BACKOFF_DELAY_MS: 5_000,
  REMOVE_ON_COMPLETE_COUNT: 50,
  REMOVE_ON_FAIL_COUNT: 20,
} as const;

export const LISTING_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  qualityScore: 'qualityScore',
  status: 'status',
  version: 'version',
  marketplace: 'marketplace',
};
