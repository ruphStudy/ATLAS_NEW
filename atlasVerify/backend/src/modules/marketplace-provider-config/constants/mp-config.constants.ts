import { ConfigurationStatus } from '../interfaces';

export const MP_CONFIG_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_TIMEOUT_MS: 30_000,
  MIN_TIMEOUT_MS: 1_000,
  MAX_TIMEOUT_MS: 120_000,
  DEFAULT_PRIORITY: 50,
  MIN_PRIORITY: 1,
  MAX_PRIORITY: 1_000,
  DEFAULT_REQUESTS_PER_MINUTE: 60,
  DEFAULT_REQUESTS_PER_HOUR: 3_000,
  DEFAULT_BATCH_SIZE: 50,
  MAX_BATCH_SIZE: 500,
  DEFAULT_CONCURRENT_BATCHES: 3,
  CACHE_TTL_MS: 300_000, // 5 min
  CACHE_MAX_ENTRIES: 1_000,

  ALLOWED_TRANSITIONS: {
    [ConfigurationStatus.DRAFT]: [
      ConfigurationStatus.PUBLISHED,
      ConfigurationStatus.ARCHIVED,
    ],
    [ConfigurationStatus.PUBLISHED]: [
      ConfigurationStatus.DISABLED,
      ConfigurationStatus.ARCHIVED,
    ],
    [ConfigurationStatus.DISABLED]: [
      ConfigurationStatus.PUBLISHED,
      ConfigurationStatus.ARCHIVED,
    ],
    [ConfigurationStatus.ARCHIVED]: [] as ConfigurationStatus[],
  } as Record<ConfigurationStatus, ConfigurationStatus[]>,

  SORT_FIELDS: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    providerKey: 'providerKey',
    name: 'name',
    status: 'status',
    version: 'version',
    priority: 'priority',
  } as Record<string, string>,

  VALID_LOG_LEVELS: ['debug', 'info', 'warn', 'error'] as const,
} as const;

export const MP_CONFIG_EVENT_QUEUE_CONFIG = {
  ATTEMPTS: 3,
  BACKOFF_MS: 3_000,
  REMOVE_ON_COMPLETE: 50,
  REMOVE_ON_FAIL: 100,
} as const;

export const CONFIG_ERROR_CODES = {
  NOT_FOUND: 'CONFIG_NOT_FOUND',
  DUPLICATE: 'CONFIG_DUPLICATE',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  INVALID_TIMEOUT: 'INVALID_TIMEOUT',
  INVALID_PRIORITY: 'INVALID_PRIORITY',
  INVALID_RETRY_POLICY: 'INVALID_RETRY_POLICY',
  INVALID_RATE_LIMIT: 'INVALID_RATE_LIMIT',
  INVALID_QUEUE_CONFIG: 'INVALID_QUEUE_CONFIG',
  INVALID_API_VERSION: 'INVALID_API_VERSION',
  INVALID_BATCH_SIZE: 'INVALID_BATCH_SIZE',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
} as const;
