import {
  ProviderCapability,
  ProviderErrorCode,
  ProviderRetryPolicy,
  SupplierProviderCode,
} from '../interfaces';

export const SUPPLIER_PROVIDER_CONSTANTS = {
  DEFAULT_TIMEOUT_MS: 30_000,
  DEFAULT_MAX_RETRIES: 3,
  DEFAULT_BACKOFF_MS: 1_000,
  DEFAULT_BACKOFF_MULTIPLIER: 2,
  DEFAULT_REQUESTS_PER_MINUTE: 60,
  DEFAULT_REQUESTS_PER_HOUR: 1_000,
  DEFAULT_BURST_LIMIT: 10,
  DEFAULT_PRIORITY: 50,
  HEALTH_CHECK_INTERVAL_MS: 60_000,
  CREDENTIAL_CACHE_TTL_MS: 300_000, // 5 min

  DEFAULT_RETRY_POLICY: {
    maxAttempts: 3,
    backoffMs: 1_000,
    backoffMultiplier: 2,
    retryableErrors: [
      ProviderErrorCode.TIMEOUT,
      ProviderErrorCode.NETWORK_ERROR,
      ProviderErrorCode.RATE_LIMITED,
      ProviderErrorCode.PROVIDER_UNAVAILABLE,
    ],
  } as ProviderRetryPolicy,

  RETRYABLE_ERROR_CODES: new Set<ProviderErrorCode>([
    ProviderErrorCode.TIMEOUT,
    ProviderErrorCode.NETWORK_ERROR,
    ProviderErrorCode.RATE_LIMITED,
    ProviderErrorCode.PROVIDER_UNAVAILABLE,
  ]),

  ALL_CAPABILITIES: Object.values(ProviderCapability),

  PROVIDER_DISPLAY_NAMES: {
    [SupplierProviderCode.INDIAMART]: 'IndiaMART',
    [SupplierProviderCode.TRADEINDIA]: 'TradeIndia',
    [SupplierProviderCode.ALIBABA]: 'Alibaba',
    [SupplierProviderCode.MADE_IN_CHINA]: 'Made-in-China',
    [SupplierProviderCode.GLOBAL_SOURCES]: 'Global Sources',
    [SupplierProviderCode.MANUAL]: 'Manual Entry',
  } as Record<SupplierProviderCode, string>,
} as const;

export const SUPPLIER_PROVIDER_QUEUE_CONFIG = {
  HEALTH_CHECK_ATTEMPTS: 2,
  HEALTH_CHECK_BACKOFF_MS: 5_000,
  HEALTH_CHECK_REMOVE_ON_COMPLETE: 10,
  HEALTH_CHECK_REMOVE_ON_FAIL: 20,
} as const;

export const SUPPLIER_PROVIDER_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  priority: 'priority',
  providerCode: 'providerCode',
  status: 'status',
};
