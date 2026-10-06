// =============================================================
// TradeIndia Adapter – Provider Constants
// =============================================================

export const TRADEINDIA_PROVIDER_CODE = 'TRADEINDIA';
export const TRADEINDIA_DISPLAY_NAME = 'TradeIndia';
export const TRADEINDIA_DESCRIPTION =
  "TradeIndia is India's second-largest B2B marketplace connecting buyers with manufacturers and exporters.";
export const TRADEINDIA_WEBSITE = 'https://www.tradeindia.com';

// ── Adapter Version ───────────────────────────────────────────
export const TRADEINDIA_ADAPTER_VERSION = { major: 1, minor: 0, patch: 0 };

// ── Supported Geography ───────────────────────────────────────
export const TRADEINDIA_SUPPORTED_REGIONS = ['Asia', 'South Asia'];
export const TRADEINDIA_SUPPORTED_COUNTRIES = ['IN'];
export const TRADEINDIA_SUPPORTED_CURRENCIES = ['INR', 'USD'];

// ── Rate Limits ───────────────────────────────────────────────
export const TRADEINDIA_RATE_LIMIT_PER_MINUTE = 60;
export const TRADEINDIA_RATE_LIMIT_PER_HOUR = 1_000;

// ── Timeout / Retry ───────────────────────────────────────────
export const TRADEINDIA_DEFAULT_TIMEOUT_MS = 20_000;
export const TRADEINDIA_DEFAULT_MAX_RETRIES = 3;

// ── Pagination ────────────────────────────────────────────────
export const TRADEINDIA_DEFAULT_PAGE_SIZE = 20;
export const TRADEINDIA_MAX_PAGE_SIZE = 100;

// ── API Paths ─────────────────────────────────────────────────
export const TRADEINDIA_API_PATHS = {
  PRODUCT_SEARCH: '/api/v1/products/search',
  PRODUCT_DETAIL: '/api/v1/products/detail',
  SUPPLIER_SEARCH: '/api/v1/sellers/search',
  SUPPLIER_DETAIL: '/api/v1/sellers/detail',
  RFQ_CREATE: '/api/v1/rfq/create',
  CATALOG_DOWNLOAD: '/api/v1/catalog/download',
  HEALTH_PING: '/api/v1/health',
} as const;

// ── Credential Keys ───────────────────────────────────────────
export const TRADEINDIA_CREDENTIAL_KEYS = {
  API_KEY: 'apiKey',
  USER_ID: 'userId',
} as const;

// ── Config Setting Keys ───────────────────────────────────────
export const TRADEINDIA_SETTING_KEYS = {
  BASE_URL: 'baseUrl',
  TIMEOUT_MS: 'timeoutMs',
  MAX_RETRIES: 'maxRetries',
  RATE_LIMIT_PER_MINUTE: 'rateLimitPerMinute',
  EMAIL_RFQ_ADDRESS: 'emailRfqAddress',
} as const;

// ── Default Base URL ──────────────────────────────────────────
export const TRADEINDIA_DEFAULT_BASE_URL = 'https://www.tradeindia.com';

// ── HTTP Status Codes ─────────────────────────────────────────
export const TRADEINDIA_HTTP_STATUS = {
  OK: 200,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  SERVER_ERROR: 500,
} as const;

// ── Membership / Verification ─────────────────────────────────
export const TRADEINDIA_MEMBER_TYPES = {
  PREMIUM: 'premium',
  VERIFIED: 'verified',
  BASIC: 'basic',
  TRUSTED: 'trusted',
} as const;

// ── Idempotency TTL ───────────────────────────────────────────
export const TRADEINDIA_IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1_000;

// ── Credential Cache TTL ──────────────────────────────────────
export const TRADEINDIA_CREDENTIAL_CACHE_TTL_MS = 5 * 60 * 1_000;
