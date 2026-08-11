export const EBAY_API_BASE_URL = 'https://api.ebay.com';

export const EBAY_SANDBOX_URL = 'https://api.sandbox.ebay.com';

export const EBAY_AUTH_ENDPOINT = 'https://api.ebay.com/identity/v1/oauth2/token';

export const EBAY_SANDBOX_AUTH_ENDPOINT = 'https://api.sandbox.ebay.com/identity/v1/oauth2/token';

export const EBAY_API_PATHS = {
  TOKEN: '/identity/v1/oauth2/token',
  INVENTORY_ITEMS: '/sell/inventory/v1/inventory_item',
  INVENTORY_ITEM: (sku: string) => `/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`,
  OFFERS: '/sell/inventory/v1/offer',
  OFFER: (offerId: string) => `/sell/inventory/v1/offer/${offerId}`,
  PUBLISH_OFFER: (offerId: string) => `/sell/inventory/v1/offer/${offerId}/publish`,
  WITHDRAW_OFFER: (offerId: string) => `/sell/inventory/v1/offer/${offerId}/withdraw`,
  ORDERS: '/sell/fulfillment/v1/order',
  ORDER: (orderId: string) => `/sell/fulfillment/v1/order/${orderId}`,
  SHIPMENT: (orderId: string) => `/sell/fulfillment/v1/order/${orderId}/shipping_fulfillment`,
  SHIPPING_FULFILLMENT: (orderId: string, fulfillmentId: string) =>
    `/sell/fulfillment/v1/order/${orderId}/shipping_fulfillment/${fulfillmentId}`,
  RETURNS: '/post-order/v2/return/search',
  RETURN: (returnId: string) => `/post-order/v2/return/${returnId}`,
  NOTIFICATIONS: '/commerce/notification/v1/public_key',
  NOTIFICATION_TOPIC: (topicId: string) => `/commerce/notification/v1/topic/${topicId}`,
  FULFILLMENT_POLICIES: '/sell/account/v1/fulfillment_policy',
  FULFILLMENT_POLICY: (policyId: string) => `/sell/account/v1/fulfillment_policy/${policyId}`,
  PAYMENT_POLICIES: '/sell/account/v1/payment_policy',
  PAYMENT_POLICY: (policyId: string) => `/sell/account/v1/payment_policy/${policyId}`,
  RETURN_POLICIES: '/sell/account/v1/return_policy',
  RETURN_POLICY: (policyId: string) => `/sell/account/v1/return_policy/${policyId}`,
} as const;

export const EBAY_RATE_LIMITS = {
  INVENTORY: { rate: 5000, burst: 10000 },
  ORDERS: { rate: 5000, burst: 10000 },
  OFFERS: { rate: 5000, burst: 10000 },
  SHIPMENTS: { rate: 5000, burst: 10000 },
  RETURNS: { rate: 5000, burst: 10000 },
  NOTIFICATIONS: { rate: 5000, burst: 10000 },
  POLICIES: { rate: 5000, burst: 10000 },
} as const;

export const EBAY_ERROR_CODES = {
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
  INVALID_OFFER: 'INVALID_OFFER',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  BUSINESS_ERROR: 'BUSINESS_ERROR',
} as const;

export const EBAY_TOKEN_EXPIRY_BUFFER = 300000;

export const EBAY_DEFAULT_PAGE_SIZE = 50;

export const EBAY_MAX_PAGE_SIZE = 200;

export const EBAY_MAX_BATCH_SIZE = {
  INVENTORY: 25,
  OFFERS: 25,
} as const;

export const EBAY_TIMEOUT = 30000;

export const EBAY_MAX_RETRIES = 3;

export const EBAY_RETRY_DELAY = 1000;

export const EBAY_OAUTH_SCOPES = [
  'https://api.ebay.com/oauth/api_scope',
  'https://api.ebay.com/oauth/api_scope/sell.inventory',
  'https://api.ebay.com/oauth/api_scope/sell.inventory.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.account',
  'https://api.ebay.com/oauth/api_scope/sell.account.readonly',
  'https://api.ebay.com/oauth/api_scope/commerce.notification.subscription',
] as const;

export const EBAY_MARKETPLACE_IDS = {
  US: 'EBAY_US',
  UK: 'EBAY_GB',
  DE: 'EBAY_DE',
  CA: 'EBAY_CA',
  AU: 'EBAY_AU',
  FR: 'EBAY_FR',
  IT: 'EBAY_IT',
  ES: 'EBAY_ES',
} as const;
