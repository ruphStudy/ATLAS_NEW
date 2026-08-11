export const WALMART_API_BASE_URL = 'https://marketplace.walmartapis.com/v3';

export const WALMART_SANDBOX_URL = 'https://sandbox.walmartapis.com/v3';

export const WALMART_AUTH_ENDPOINT = 'https://marketplace.walmartapis.com/v3/token';

export const WALMART_API_PATHS = {
  TOKEN: '/token',
  ORDERS: '/orders',
  ORDER: (purchaseOrderId: string) => `/orders/${purchaseOrderId}`,
  ACKNOWLEDGE_ORDER: (purchaseOrderId: string) => `/orders/${purchaseOrderId}/acknowledge`,
  ITEMS: '/items',
  ITEM: (sku: string) => `/items/${sku}`,
  INVENTORY: '/inventory',
  FEEDS: '/feeds',
  FEED: (feedId: string) => `/feeds/${feedId}`,
  PRICES: '/prices',
  SHIPMENTS: '/orders/shipments',
  RETURNS: '/returns',
  RETURN: (returnOrderId: string) => `/returns/${returnOrderId}`,
  REPORTS: '/reports',
  REPORT: (reportId: string) => `/reports/${reportId}`,
} as const;

export const WALMART_RATE_LIMITS = {
  ORDERS: { rate: 20, burst: 100 },
  ITEMS: { rate: 20, burst: 100 },
  INVENTORY: { rate: 20, burst: 100 },
  FEEDS: { rate: 10, burst: 50 },
  PRICES: { rate: 20, burst: 100 },
  SHIPMENTS: { rate: 20, burst: 100 },
  RETURNS: { rate: 20, burst: 100 },
  REPORTS: { rate: 10, burst: 50 },
} as const;

export const WALMART_ERROR_CODES = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INVALID_TOKEN: 'INVALID_TOKEN',
  EXPIRED_TOKEN: 'EXPIRED_TOKEN',
  INVALID_SKU: 'INVALID_SKU',
  INVALID_ORDER: 'INVALID_ORDER',
  ITEM_NOT_FOUND: 'ITEM_NOT_FOUND',
} as const;

export const WALMART_TOKEN_EXPIRY_BUFFER = 300000;

export const WALMART_DEFAULT_PAGE_SIZE = 50;

export const WALMART_MAX_PAGE_SIZE = 200;

export const WALMART_MAX_BATCH_SIZE = {
  ORDERS: 200,
  ITEMS: 100,
  INVENTORY: 1000,
  PRICES: 500,
} as const;

export const WALMART_TIMEOUT = 30000;

export const WALMART_MAX_RETRIES = 3;

export const WALMART_RETRY_DELAY = 1000;
