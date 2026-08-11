import { AmazonMarketplace, AmazonRegion, AmazonReportType } from '../interfaces/amazon.interfaces';

export const AMAZON_SP_API_ENDPOINTS = {
  [AmazonRegion.NA]: 'https://sellingpartnerapi-na.amazon.com',
  [AmazonRegion.EU]: 'https://sellingpartnerapi-eu.amazon.com',
  [AmazonRegion.FE]: 'https://sellingpartnerapi-fe.amazon.com',
} as const;

export const AMAZON_AUTH_ENDPOINT = 'https://api.amazon.com/auth/o2/token';

export const AMAZON_MARKETPLACE_REGIONS = {
  [AmazonMarketplace.US]: AmazonRegion.NA,
  [AmazonMarketplace.CA]: AmazonRegion.NA,
  [AmazonMarketplace.MX]: AmazonRegion.NA,
  [AmazonMarketplace.BR]: AmazonRegion.NA,
  [AmazonMarketplace.UK]: AmazonRegion.EU,
  [AmazonMarketplace.DE]: AmazonRegion.EU,
  [AmazonMarketplace.FR]: AmazonRegion.EU,
  [AmazonMarketplace.IT]: AmazonRegion.EU,
  [AmazonMarketplace.ES]: AmazonRegion.EU,
  [AmazonMarketplace.NL]: AmazonRegion.EU,
  [AmazonMarketplace.SE]: AmazonRegion.EU,
  [AmazonMarketplace.PL]: AmazonRegion.EU,
  [AmazonMarketplace.TR]: AmazonRegion.EU,
  [AmazonMarketplace.AE]: AmazonRegion.EU,
  [AmazonMarketplace.IN]: AmazonRegion.EU,
  [AmazonMarketplace.SG]: AmazonRegion.FE,
  [AmazonMarketplace.AU]: AmazonRegion.FE,
  [AmazonMarketplace.JP]: AmazonRegion.FE,
} as const;

export const AMAZON_API_PATHS = {
  TOKEN: '/auth/o2/token',
  ORDERS: '/orders/v0/orders',
  ORDER_ITEMS: (orderId: string) => `/orders/v0/orders/${orderId}/orderItems`,
  CATALOG_ITEMS: '/catalog/2022-04-01/items',
  CATALOG_ITEM: (asin: string) => `/catalog/2022-04-01/items/${asin}`,
  LISTINGS_ITEMS: '/listings/2021-08-01/items',
  LISTINGS_ITEM: (sellerId: string, sku: string) =>
    `/listings/2021-08-01/items/${sellerId}/${sku}`,
  INVENTORY_SUMMARIES: '/fba/inventory/v1/summaries',
  SHIPMENTS: '/fba/inbound/v0/shipments',
  SHIPMENT: (shipmentId: string) => `/fba/inbound/v0/shipments/${shipmentId}`,
  REPORTS: '/reports/2021-06-30/reports',
  REPORT: (reportId: string) => `/reports/2021-06-30/reports/${reportId}`,
  REPORT_DOCUMENT: (documentId: string) =>
    `/reports/2021-06-30/documents/${documentId}`,
  CREATE_REPORT: '/reports/2021-06-30/reports',
  FEEDS: '/feeds/2021-06-30/feeds',
  FEED: (feedId: string) => `/feeds/2021-06-30/feeds/${feedId}`,
  CREATE_FEED: '/feeds/2021-06-30/feeds',
  FEED_DOCUMENT: (documentId: string) =>
    `/feeds/2021-06-30/documents/${documentId}`,
  NOTIFICATIONS_SUBSCRIPTIONS: '/notifications/v1/subscriptions',
  NOTIFICATIONS_DESTINATIONS: '/notifications/v1/destinations',
  PRODUCT_PRICING: '/products/pricing/v0/price',
  COMPETITIVE_PRICING: '/products/pricing/v0/competitivePrice',
  SELLER_INFO: '/sellers/v1/marketplaceParticipations',
} as const;

export const AMAZON_RATE_LIMITS = {
  ORDERS: { rate: 0.0167, burst: 20 },
  ORDER_ITEMS: { rate: 0.5, burst: 30 },
  CATALOG_ITEMS: { rate: 5, burst: 5 },
  LISTINGS_ITEMS: { rate: 5, burst: 10 },
  INVENTORY_SUMMARIES: { rate: 2, burst: 2 },
  SHIPMENTS: { rate: 2, burst: 30 },
  REPORTS: { rate: 0.0222, burst: 15 },
  FEEDS: { rate: 0.0222, burst: 15 },
  NOTIFICATIONS: { rate: 1, burst: 5 },
  PRICING: { rate: 0.5, burst: 1 },
  SELLER_INFO: { rate: 1, burst: 5 },
} as const;

export const AMAZON_ERROR_CODES = {
  INVALID_INPUT: 'InvalidInput',
  UNAUTHORIZED: 'Unauthorized',
  ACCESS_DENIED: 'AccessDenied',
  INVALID_ACCESS_TOKEN: 'InvalidAccessToken',
  RATE_LIMIT_EXCEEDED: 'QuotaExceeded',
  REQUEST_THROTTLED: 'RequestThrottled',
  INTERNAL_ERROR: 'InternalFailure',
  SERVICE_UNAVAILABLE: 'ServiceUnavailable',
  INVALID_PARAMETER: 'InvalidParameterValue',
  RESOURCE_NOT_FOUND: 'ResourceNotFound',
  INVALID_ASIN: 'InvalidASIN',
  INVALID_ORDER_ID: 'InvalidOrderId',
} as const;

export const AMAZON_TOKEN_EXPIRY_BUFFER = 300000;

export const AMAZON_DEFAULT_PAGE_SIZE = 100;

export const AMAZON_MAX_BATCH_SIZE = {
  ORDERS: 50,
  LISTINGS: 20,
  INVENTORY: 50,
  FEEDS: 1,
} as const;

export const AMAZON_TIMEOUT = 30000;

export const AMAZON_MAX_RETRIES = 3;

export const AMAZON_RETRY_DELAY = 1000;
