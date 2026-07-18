export const APP_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_CURRENCY: 'USD',
  DEFAULT_LOCALE: 'en-US',
  DEFAULT_TIMEZONE: 'UTC',
} as const;

export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  REPORTS: 'reports',
  MARKETPLACE_SYNC: 'marketplace-sync',
  AI_PROCESSING: 'ai-processing',
  EMAIL: 'email',
  DISCOVERY: 'discovery',
  SUPPLIER_DISCOVERY: 'supplier-discovery',
  SUPPLIER_VERIFICATION: 'supplier-verification',
  PRODUCT_ANALYSIS: 'product-analysis',
  COMPETITION_ANALYSIS: 'competition-analysis',
  PROFIT_CALCULATOR: 'profit-calculator',
  PRODUCT_SCORING: 'product-scoring',
  RFQ_NOTIFICATIONS: 'rfq-notifications',
  QUOTATION_COMPARISON: 'quotation-comparison',
  PRODUCT_COST: 'product-cost',
  PROCUREMENT: 'procurement',
  PURCHASE_ORDER: 'purchase-order',
  SHIPMENT_EVENTS: 'shipment-events',
  SHIPMENT_TRACKING_SYNC: 'shipment-tracking-sync',
  QUALITY_INSPECTION: 'quality-inspection',
  PRODUCT_CATALOG: 'product-catalog',
  AI_DESCRIPTION_EVENTS: 'ai-description-events',
  AI_DESCRIPTION_GENERATION: 'ai-description-generation',
  AI_IMAGE_EVENTS: 'ai-image-events',
  AI_IMAGE_GENERATION: 'ai-image-generation',
  AI_SEO_EVENTS: 'ai-seo-events',
  AI_SEO_OPTIMIZATION: 'ai-seo-optimization',
  LISTING_EVENTS: 'listing-events',
  LISTING_GENERATION: 'listing-generation',
  LISTING_APPROVAL_EVENTS: 'listing-approval-events',
  LISTING_APPROVAL_NOTIFICATIONS: 'listing-approval-notifications',
  PUBLICATION_EVENTS: 'publication-events',
  LISTING_PUBLISH: 'listing-publish',
  LISTING_BULK_PUBLISH: 'listing-bulk-publish',
  PROVIDER_HEALTH_CHECK: 'provider-health-check',
  MARKETPLACE_MAPPING_EVENTS: 'marketplace-mapping-events',
  MARKETPLACE_TRANSFORMATION: 'marketplace-transformation',
  PRICING_EVENTS: 'pricing-events',
  PRICING_CALCULATION: 'pricing-calculation',
  UNIVERSAL_LISTING_GENERATION: 'universal-listing-generation',
  UNIVERSAL_LISTING_EVENTS: 'universal-listing-events',
  MARKETPLACE_LISTING_TRANSFORMATION: 'marketplace-listing-transformation',
  MARKETPLACE_LISTING_EVENTS: 'marketplace-listing-events',
  MARKETPLACE_PROVIDER_HEALTH_CHECK: 'marketplace-provider-health-check',
  MARKETPLACE_PROVIDER_EVENTS: 'marketplace-provider-events',
  MARKETPLACE_PROVIDER_CONNECTION_TEST: 'marketplace-provider-connection-test',
  MARKETPLACE_PROVIDER_CREDENTIAL_VALIDATION: 'marketplace-provider-credential-validation',
  MARKETPLACE_PROVIDER_CONFIG_EVENTS: 'marketplace-provider-config-events',
} as const;

export const CACHE_KEYS = {
  WORKSPACE_SETTINGS: (workspaceId: string) => `workspace:${workspaceId}:settings`,
  USER_PROFILE: (userId: string) => `user:${userId}:profile`,
  DASHBOARD_STATS: (workspaceId: string) => `workspace:${workspaceId}:dashboard`,
} as const;

export const CACHE_TTL = {
  SHORT: 60,         // 1 minute
  MEDIUM: 300,       // 5 minutes
  LONG: 3600,        // 1 hour
  VERY_LONG: 86400,  // 24 hours
} as const;

/** Standard HTTP header names used across the application */
export const HTTP_HEADERS = {
  REQUEST_ID: 'x-request-id',
  WORKSPACE_ID: 'x-workspace-id',
  AUTHORIZATION: 'authorization',
  CONTENT_TYPE: 'content-type',
  ACCEPT: 'accept',
} as const;

/** API versioning and routing */
export const API = {
  PREFIX: 'api',
  VERSION: '1',
  DOCS_PATH: 'api/docs',
} as const;
