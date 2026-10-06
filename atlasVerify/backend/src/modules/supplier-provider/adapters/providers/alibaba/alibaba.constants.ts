// =============================================================
// Alibaba Adapter – Provider Constants
// =============================================================

export const ALIBABA_PROVIDER_CODE = 'ALIBABA';
export const ALIBABA_DISPLAY_NAME = 'Alibaba';
export const ALIBABA_DESCRIPTION =
  "Alibaba is the world's largest B2B marketplace connecting global buyers with manufacturers and suppliers.";
export const ALIBABA_WEBSITE = 'https://www.alibaba.com';

// ── Adapter Version ───────────────────────────────────────────
export const ALIBABA_ADAPTER_VERSION = { major: 1, minor: 0, patch: 0 };

// ── Supported Geography ───────────────────────────────────────
export const ALIBABA_SUPPORTED_REGIONS = ['Asia', 'Global', 'Europe', 'Americas'];
export const ALIBABA_SUPPORTED_COUNTRIES: string[] = []; // global — empty means all countries
export const ALIBABA_SUPPORTED_CURRENCIES = ['USD', 'EUR', 'CNY', 'GBP', 'JPY', 'AED', 'INR'];

// ── Rate Limits ───────────────────────────────────────────────
/** Alibaba Open Platform default: 1000 calls / day per app key; conservative per-minute guard */
export const ALIBABA_RATE_LIMIT_PER_MINUTE = 30;
export const ALIBABA_RATE_LIMIT_PER_HOUR = 500;

// ── Timeout / Retry ───────────────────────────────────────────
export const ALIBABA_DEFAULT_TIMEOUT_MS = 25_000;
export const ALIBABA_DEFAULT_MAX_RETRIES = 3;

// ── Pagination Defaults ───────────────────────────────────────
export const ALIBABA_DEFAULT_PAGE_SIZE = 20;
export const ALIBABA_MAX_PAGE_SIZE = 100;

// ── API Method Names ──────────────────────────────────────────
export const ALIBABA_API_METHODS = {
  PRODUCT_SEARCH: 'alibaba.icbu.product.list',
  PRODUCT_DETAIL: 'alibaba.icbu.product.get',
  SUPPLIER_SEARCH: 'alibaba.icbu.company.list',
  SUPPLIER_DETAIL: 'alibaba.icbu.company.get',
  RFQ_CREATE: 'alibaba.icbu.rfq.create',
  ORDER_CREATE: 'alibaba.icbu.order.create',
  ORDER_DETAIL: 'alibaba.icbu.order.get',
  LOGISTICS_TRACKING: 'alibaba.icbu.logistics.tracking.get',
  TOKEN_REFRESH: 'taobao.top.auth.token.refresh',
} as const;

// ── Credential / Config Keys ──────────────────────────────────
export const ALIBABA_CREDENTIAL_KEYS = {
  APP_KEY: 'appKey',
  APP_SECRET: 'appSecret',
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
} as const;

export const ALIBABA_SETTING_KEYS = {
  BASE_URL: 'baseUrl',
  TIMEOUT_MS: 'timeoutMs',
  MAX_RETRIES: 'maxRetries',
  LOCALE: 'locale',
  REGION: 'region',
  ENVIRONMENT: 'environment',
  RATE_LIMIT_PER_MINUTE: 'rateLimitPerMinute',
  EMAIL_RFQ_ADDRESS: 'emailRfqAddress',
} as const;

// ── Default Base URL ──────────────────────────────────────────
export const ALIBABA_DEFAULT_BASE_URL = 'https://eco.taobao.com/router/rest';

// ── API Format/Version ────────────────────────────────────────
export const ALIBABA_API_FORMAT = 'json';
export const ALIBABA_API_V = '2.0';
export const ALIBABA_SIGN_METHOD = 'hmac-sha256';

// ── HTTP Status Codes ─────────────────────────────────────────
export const ALIBABA_HTTP_STATUS = {
  OK: 200,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  SERVER_ERROR: 500,
} as const;

// ── Alibaba Verification Type Mapping ─────────────────────────
export const ALIBABA_VERIFICATION_TYPES = {
  VERIFIED_SUPPLIER: 'Verified Supplier',
  GOLD_SUPPLIER: 'Gold Supplier',
  TRADE_ASSURANCE: 'Trade Assurance',
  ASSESSED_SUPPLIER: 'Assessed Supplier',
  AUDIT_REPORT: 'Audit Report',
} as const;

// ── Alibaba Shipment Status Mapping ───────────────────────────
export const ALIBABA_SHIPMENT_STATUS_MAP: Record<string, string> = {
  CREATED: 'CREATED',
  PICKED_UP: 'PICKED_UP',
  IN_TRANSIT: 'IN_TRANSIT',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  EXCEPTION: 'EXCEPTION',
  RETURNED: 'RETURNED',
};

// ── Idempotency TTL ───────────────────────────────────────────
export const ALIBABA_IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1_000; // 24 hours

// ── Credential Cache TTL ──────────────────────────────────────
export const ALIBABA_CREDENTIAL_CACHE_TTL_MS = 5 * 60 * 1_000; // 5 min

// ── Alibaba API Error Codes (sub_code) ────────────────────────
export const ALIBABA_ERROR_CODES = {
  INVALID_SESSION: 'invalid-sessionkey',
  SESSION_EXPIRED: 'session-expired',
  ACCESS_DENIED: 'accesscontrol.limited-by-app-access-count',
  RATE_LIMITED: 'rate-limit-exceeded',
  PARAM_ERROR: 'invalid-parameter',
  PERMISSION_DENIED: 'permission-denied',
} as const;
