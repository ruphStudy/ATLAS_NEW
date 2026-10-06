export const MEESHO_API_BASE_URL = 'https://supplier.meesho.com/api/v1';

export const MEESHO_SANDBOX_URL = 'https://sandbox-supplier.meesho.com/api/v1';

export const MEESHO_API_PATHS = {
  ORDERS: '/orders',
  ORDER: (orderId: string) => `/orders/${orderId}`,
  PRODUCTS: '/products',
  PRODUCT: (productId: string) => `/products/${productId}`,
  INVENTORY: '/inventory',
  INVENTORY_UPDATE: (sku: string) => `/inventory/${sku}`,
  SHIPMENTS: '/shipments',
  SHIPMENT: (shipmentId: string) => `/shipments/${shipmentId}`,
  RETURNS: '/returns',
  RETURN: (returnId: string) => `/returns/${returnId}`,
  PRICES: '/prices',
  PRICE_UPDATE: (sku: string) => `/prices/${sku}`,
  REPORTS: '/reports',
  REPORT: (reportId: string) => `/reports/${reportId}`,
  CATEGORIES: '/categories',
  SUPPLIER_INFO: '/supplier/info',
} as const;

export const MEESHO_RATE_LIMITS = {
  ORDERS: { rate: 100, burst: 200 },
  PRODUCTS: { rate: 100, burst: 200 },
  INVENTORY: { rate: 100, burst: 200 },
  SHIPMENTS: { rate: 100, burst: 200 },
  RETURNS: { rate: 100, burst: 200 },
  PRICES: { rate: 100, burst: 200 },
  REPORTS: { rate: 50, burst: 100 },
} as const;

export const MEESHO_ERROR_CODES = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INVALID_API_KEY: 'INVALID_API_KEY',
  INVALID_SKU: 'INVALID_SKU',
  INVALID_ORDER: 'INVALID_ORDER',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;

export const MEESHO_DEFAULT_PAGE_SIZE = 50;

export const MEESHO_MAX_PAGE_SIZE = 100;

export const MEESHO_MAX_BATCH_SIZE = {
  PRODUCTS: 50,
  INVENTORY: 100,
  PRICES: 50,
} as const;

export const MEESHO_TIMEOUT = 30000;

export const MEESHO_MAX_RETRIES = 3;

export const MEESHO_RETRY_DELAY = 1000;

export const MEESHO_ORDER_STATUSES = [
  'PLACED',
  'APPROVED',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
] as const;

export const MEESHO_PRODUCT_STATUSES = [
  'ACTIVE',
  'INACTIVE',
  'PENDING',
  'REJECTED',
] as const;
