import {
  MarketplaceCapability,
  MarketplaceErrorCode,
  MarketplaceRetryPolicy,
} from '../interfaces';

export const MARKETPLACE_PROVIDER_CONSTANTS = {
  DEFAULT_TIMEOUT_MS: 30_000,
  DEFAULT_MAX_RETRIES: 3,
  DEFAULT_BACKOFF_MS: 1_000,
  DEFAULT_BACKOFF_MULTIPLIER: 2,
  DEFAULT_REQUESTS_PER_MINUTE: 60,
  DEFAULT_REQUESTS_PER_HOUR: 3_000,
  DEFAULT_BURST_LIMIT: 20,
  DEFAULT_PRIORITY: 50,
  HEALTH_CHECK_INTERVAL_MS: 60_000,
  CREDENTIAL_CACHE_TTL_MS: 300_000,
  MAX_ACCOUNTS_PER_PROVIDER: 50,
  CONNECTION_TEST_TIMEOUT_MS: 15_000,

  DEFAULT_RETRY_POLICY: {
    maxAttempts: 3,
    backoffMs: 1_000,
    backoffMultiplier: 2,
    retryableErrors: [
      MarketplaceErrorCode.TIMEOUT,
      MarketplaceErrorCode.NETWORK_ERROR,
      MarketplaceErrorCode.RATE_LIMITED,
      MarketplaceErrorCode.PROVIDER_UNAVAILABLE,
    ],
  } as MarketplaceRetryPolicy,

  RETRYABLE_ERROR_CODES: new Set<MarketplaceErrorCode>([
    MarketplaceErrorCode.TIMEOUT,
    MarketplaceErrorCode.NETWORK_ERROR,
    MarketplaceErrorCode.RATE_LIMITED,
    MarketplaceErrorCode.PROVIDER_UNAVAILABLE,
  ]),

  ALL_CAPABILITIES: Object.values(MarketplaceCapability),

  // Allowed state transitions for provider status
  CAPABILITY_CATEGORIES: {
    LISTING: [
      MarketplaceCapability.PUBLISH_LISTING,
      MarketplaceCapability.UPDATE_LISTING,
      MarketplaceCapability.DELETE_LISTING,
      MarketplaceCapability.GET_LISTING,
      MarketplaceCapability.SEARCH_LISTINGS,
      MarketplaceCapability.BULK_LISTING,
    ],
    INVENTORY: [
      MarketplaceCapability.SYNC_INVENTORY,
      MarketplaceCapability.UPDATE_INVENTORY,
      MarketplaceCapability.GET_INVENTORY,
    ],
    ORDERS: [
      MarketplaceCapability.SYNC_ORDERS,
      MarketplaceCapability.GET_ORDER,
      MarketplaceCapability.UPDATE_ORDER,
      MarketplaceCapability.CANCEL_ORDER,
    ],
    SHIPMENT: [
      MarketplaceCapability.SYNC_SHIPMENTS,
      MarketplaceCapability.CREATE_SHIPMENT,
      MarketplaceCapability.GET_SHIPMENT,
      MarketplaceCapability.TRACK_SHIPMENT,
    ],
    RETURNS: [
      MarketplaceCapability.SYNC_RETURNS,
      MarketplaceCapability.PROCESS_RETURN,
      MarketplaceCapability.GET_RETURN,
    ],
    PRICING: [
      MarketplaceCapability.SYNC_PRICING,
      MarketplaceCapability.UPDATE_PRICING,
      MarketplaceCapability.GET_PRICING,
      MarketplaceCapability.REPRICING,
    ],
    CATALOG: [
      MarketplaceCapability.SYNC_CATALOG,
      MarketplaceCapability.GET_CATALOG,
      MarketplaceCapability.UPDATE_CATALOG,
    ],
    REPORTS: [
      MarketplaceCapability.SYNC_REPORTS,
      MarketplaceCapability.GET_REPORT,
      MarketplaceCapability.REQUEST_REPORT,
    ],
  } as const,

  SORT_FIELDS: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    priority: 'priority',
    providerKey: 'providerKey',
    status: 'status',
    displayName: 'displayName',
  } as Record<string, string>,
} as const;

export const MARKETPLACE_PROVIDER_QUEUE_CONFIG = {
  HEALTH_CHECK_ATTEMPTS: 2,
  HEALTH_CHECK_BACKOFF_MS: 5_000,
  HEALTH_CHECK_REMOVE_ON_COMPLETE: 20,
  HEALTH_CHECK_REMOVE_ON_FAIL: 50,
  CONNECTION_TEST_ATTEMPTS: 3,
  CONNECTION_TEST_BACKOFF_MS: 3_000,
  CREDENTIAL_VALIDATION_ATTEMPTS: 2,
  EVENT_ATTEMPTS: 3,
  EVENT_BACKOFF_MS: 2_000,
} as const;
