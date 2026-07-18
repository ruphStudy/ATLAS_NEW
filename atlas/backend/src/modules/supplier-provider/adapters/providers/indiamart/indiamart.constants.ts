// =============================================================
// IndiaMART Adapter – Provider Constants
// =============================================================

export const INDIAMART_PROVIDER_CODE = 'INDIAMART';
export const INDIAMART_DISPLAY_NAME = 'IndiaMART';
export const INDIAMART_DESCRIPTION =
  'IndiaMART is India\'s largest online B2B marketplace connecting buyers with suppliers.';
export const INDIAMART_WEBSITE = 'https://www.indiamart.com';

// ── Adapter Version ───────────────────────────────────────────
export const INDIAMART_ADAPTER_VERSION = { major: 1, minor: 0, patch: 0 };

// ── Supported Regions / Geography ────────────────────────────
export const INDIAMART_SUPPORTED_REGIONS = ['Asia', 'South Asia'];
export const INDIAMART_SUPPORTED_COUNTRIES = ['IN']; // primary, but products can ship globally
export const INDIAMART_SUPPORTED_CURRENCIES = ['INR', 'USD'];

// ── Rate Limits ───────────────────────────────────────────────
/** IndiaMART API rate limit: ~60 requests per minute per API key */
export const INDIAMART_RATE_LIMIT_PER_MINUTE = 60;
/** IndiaMART API rate limit: ~1000 requests per hour */
export const INDIAMART_RATE_LIMIT_PER_HOUR = 1_000;

// ── Timeout / Retry Defaults ──────────────────────────────────
export const INDIAMART_DEFAULT_TIMEOUT_MS = 20_000;
export const INDIAMART_DEFAULT_MAX_RETRIES = 3;

// ── Pagination Defaults ───────────────────────────────────────
export const INDIAMART_DEFAULT_PAGE_SIZE = 20;
export const INDIAMART_MAX_PAGE_SIZE = 100;

// ── API Path Segments ─────────────────────────────────────────
export const INDIAMART_API_PATHS = {
  PRODUCT_SEARCH: '/api/productSearch',
  BUYER_LEAD: '/api/messageSell/v2',
  SUPPLIER_DETAIL: '/api/supplier/profile',
  PRODUCT_DETAIL: '/api/productDetail',
  CATALOG_DOWNLOAD: '/api/productCatalog',
  HEALTH_PING: '/api/health',
} as const;

// ── Credential Field Keys ─────────────────────────────────────
export const INDIAMART_CREDENTIAL_KEYS = {
  API_KEY: 'apiKey',
  MOBILE_NUMBER: 'mobileNumber',
} as const;

// ── Configurable Settings Keys (customSettings) ───────────────
export const INDIAMART_SETTING_KEYS = {
  BASE_URL: 'baseUrl',
  TIMEOUT_MS: 'timeoutMs',
  MAX_RETRIES: 'maxRetries',
  RATE_LIMIT_PER_MINUTE: 'rateLimitPerMinute',
  EMAIL_RFQ_ADDRESS: 'emailRfqAddress',
} as const;

// ── Default Base URL ─────────────────────────────────────────
export const INDIAMART_DEFAULT_BASE_URL = 'https://akm.indiamart.com';

// ── HTTP Status Codes ─────────────────────────────────────────
export const INDIAMART_HTTP_STATUS = {
  OK: 200,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  SERVER_ERROR: 500,
} as const;

// ── IndiaMART verification status mapping ─────────────────────
export const INDIAMART_VERIFICATION_STATUSES = {
  VERIFIED_SUPPLIER: 'TrustSEAL Verified',
  VERIFIED_PLUS: 'IndiaMART Verified',
  NOT_VERIFIED: 'Unverified',
} as const;

// ── Idempotency TTL ───────────────────────────────────────────
export const INDIAMART_IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1_000; // 24 hours
