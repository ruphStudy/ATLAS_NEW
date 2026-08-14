import { ShippingCapability, ShippingErrorCode } from '../interfaces';

export const SHIPPING_PROVIDER_CONSTANTS = {
  DEFAULT_TIMEOUT_MS: 30_000,
  DEFAULT_MAX_RETRIES: 3,
  DEFAULT_REQUESTS_PER_MINUTE: 60,
  DEFAULT_PRIORITY: 50,
  HEALTH_CHECK_INTERVAL_MS: 60_000,
  CREDENTIAL_CACHE_TTL_MS: 300_000, // 5 min

  RETRYABLE_ERROR_CODES: new Set<ShippingErrorCode>([
    ShippingErrorCode.TIMEOUT,
    ShippingErrorCode.NETWORK_ERROR,
    ShippingErrorCode.RATE_LIMITED,
    ShippingErrorCode.PROVIDER_UNAVAILABLE,
  ]),

  ALL_CAPABILITIES: Object.values(ShippingCapability),
} as const;

export const SHIPPING_PROVIDER_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  priority: 'priority',
  providerKey: 'providerKey',
  status: 'status',
};
