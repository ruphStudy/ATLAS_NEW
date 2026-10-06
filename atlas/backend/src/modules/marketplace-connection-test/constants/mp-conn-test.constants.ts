import { ConnectionErrorCategory } from '../interfaces';

export const MP_CONN_TEST_CONSTANTS = {
  DEFAULT_TIMEOUT_MS: 15_000,
  MAX_TIMEOUT_MS: 60_000,
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 200,
  MAX_RETRIES: 2,
  RETRY_DELAY_MS: 3_000,
  CONCURRENT_LOCK_TTL_MS: 30_000,
} as const;

export const MP_CONN_TEST_ERROR_CODES = {
  NOT_FOUND: 'CONN_TEST_NOT_FOUND',
  DUPLICATE_IN_PROGRESS: 'CONN_TEST_DUPLICATE_IN_PROGRESS',
  PROVIDER_NOT_REGISTERED: 'CONN_TEST_PROVIDER_NOT_REGISTERED',
  CREDENTIALS_MISSING: 'CONN_TEST_CREDENTIALS_MISSING',
  VALIDATION_FAILED: 'CONN_TEST_VALIDATION_FAILED',
  TIMEOUT: 'CONN_TEST_TIMEOUT',
  AUTH_FAILED: 'CONN_TEST_AUTH_FAILED',
  RATE_LIMITED: 'CONN_TEST_RATE_LIMITED',
  NETWORK_ERROR: 'CONN_TEST_NETWORK_ERROR',
  UNSUPPORTED_CAPABILITY: 'CONN_TEST_UNSUPPORTED_CAPABILITY',
  CONFIGURATION_ERROR: 'CONN_TEST_CONFIGURATION_ERROR',
  PROVIDER_ERROR: 'CONN_TEST_PROVIDER_ERROR',
} as const;

/** Maps error message patterns to (errorCode, category, retryable). */
export const ERROR_CLASSIFICATION: Array<{
  patterns: string[];
  code: string;
  category: ConnectionErrorCategory;
  retryable: boolean;
}> = [
  {
    patterns: ['timeout', 'timed out', 'etimedout'],
    code: MP_CONN_TEST_ERROR_CODES.TIMEOUT,
    category: ConnectionErrorCategory.TIMEOUT,
    retryable: true,
  },
  {
    patterns: ['rate limit', 'rate-limit', 'too many requests', 'throttled', '429'],
    code: MP_CONN_TEST_ERROR_CODES.RATE_LIMITED,
    category: ConnectionErrorCategory.RATE_LIMIT,
    retryable: true,
  },
  {
    patterns: ['network', 'econnrefused', 'enotfound', 'socket', 'dns', 'unreachable'],
    code: MP_CONN_TEST_ERROR_CODES.NETWORK_ERROR,
    category: ConnectionErrorCategory.NETWORK,
    retryable: true,
  },
  {
    patterns: ['unauthorized', 'unauthenticated', '401', 'invalid credentials', 'auth failed', 'credentials expired', 'access denied'],
    code: MP_CONN_TEST_ERROR_CODES.AUTH_FAILED,
    category: ConnectionErrorCategory.AUTHENTICATION,
    retryable: false,
  },
  {
    patterns: ['no credentials configured', 'credentials missing', 'credential not found'],
    code: MP_CONN_TEST_ERROR_CODES.CREDENTIALS_MISSING,
    category: ConnectionErrorCategory.CONFIGURATION,
    retryable: false,
  },
  {
    patterns: ['unsupported capability', 'capability not supported', 'not supported'],
    code: MP_CONN_TEST_ERROR_CODES.UNSUPPORTED_CAPABILITY,
    category: ConnectionErrorCategory.UNSUPPORTED_CAPABILITY,
    retryable: false,
  },
  {
    patterns: ['configuration', 'missing config', 'invalid config'],
    code: MP_CONN_TEST_ERROR_CODES.CONFIGURATION_ERROR,
    category: ConnectionErrorCategory.CONFIGURATION,
    retryable: false,
  },
];

export const MP_CONN_TEST_QUEUE_CONFIG = {
  ATTEMPTS: 3,
  BACKOFF_MS: 5_000,
  REMOVE_ON_COMPLETE: 100,
  REMOVE_ON_FAIL: 100,
} as const;
