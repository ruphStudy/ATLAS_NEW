export const FLIPKART_API_BASE_URL = 'https://api.flipkart.net/sellers';

export const FLIPKART_SANDBOX_URL = 'https://sandbox-api.flipkart.net/sellers';

export const FLIPKART_AUTH_ENDPOINT = '/oauth-token';

export const FLIPKART_API_PATHS = {
  AUTH: '/oauth-token',
  ORDERS: '/orders/search',
  ORDER: (orderId: string) => `/orders/${orderId}`,
  ORDER_ITEMS: (orderId: string) => `/orders/${orderId}/items`,
  SHIPMENTS: '/orders/shipments',
  SHIPMENT: (shipmentId: string) => `/shipments/${shipmentId}`,
  DISPATCH_SHIPMENT: (orderId: string) => `/orders/${orderId}/dispatch`,
  CANCEL_ORDER_ITEM: '/orders/cancel',
  LISTINGS: '/skus',
  LISTING: (sku: string) => `/skus/${sku}`,
  LISTING_ATTRIBUTES: (sku: string) => `/skus/${sku}/attributes`,
  INVENTORY: '/inventory',
  PRODUCTS: '/products',
  PRODUCT: (fsn: string) => `/products/${fsn}`,
  RETURNS: '/returns/search',
  RETURN: (returnId: string) => `/returns/${returnId}`,
  RETURN_ACTION: (returnId: string) => `/returns/${returnId}/action`,
  PRICING: '/pricing',
  REPORTS: '/reports',
  REPORT: (reportId: string) => `/reports/${reportId}`,
  SERVICE_PROFILE: '/service-profile',
} as const;

export const FLIPKART_RATE_LIMITS = {
  ORDERS: { rate: 2, burst: 10 },
  ORDER_ITEMS: { rate: 5, burst: 20 },
  LISTINGS: { rate: 2, burst: 10 },
  INVENTORY: { rate: 5, burst: 20 },
  SHIPMENTS: { rate: 2, burst: 10 },
  RETURNS: { rate: 2, burst: 10 },
  PRICING: { rate: 2, burst: 10 },
  REPORTS: { rate: 1, burst: 5 },
  PRODUCTS: { rate: 2, burst: 10 },
} as const;

export const FLIPKART_ERROR_CODES = {
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
  LISTING_NOT_FOUND: 'LISTING_NOT_FOUND',
} as const;

export const FLIPKART_TOKEN_EXPIRY_BUFFER = 300000;

export const FLIPKART_DEFAULT_PAGE_SIZE = 20;

export const FLIPKART_MAX_BATCH_SIZE = {
  ORDERS: 50,
  LISTINGS: 100,
  INVENTORY: 200,
  PRICING: 100,
} as const;

export const FLIPKART_TIMEOUT = 30000;

export const FLIPKART_MAX_RETRIES = 3;

export const FLIPKART_RETRY_DELAY = 1000;
