import { MarketplaceHealthState } from '../interfaces';

export const MP_HEALTH_CONSTANTS = {
  DEFAULT_CHECK_INTERVAL_MS: 60_000,       // 1 min
  DEFAULT_TIMEOUT_MS: 15_000,              // 15 s
  MAX_HISTORY_PER_PROVIDER: 500,
  CONSECUTIVE_FAILURE_THRESHOLD: 3,        // DEGRADED after N failures
  CONSECUTIVE_FAILURE_OFFLINE_THRESHOLD: 5,// OFFLINE after N failures
  RETRY_DELAY_MS: 5_000,
  MAX_RETRIES: 2,
  CACHE_TTL_MS: 30_000,                    // 30 s for status cache
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 200,
  LATENCY_WINDOW: 20,                      // number of samples for rolling avg

  DEGRADED_RESPONSE_TIME_MS: 3_000,
  UNHEALTHY_RESPONSE_TIME_MS: 10_000,
  DEGRADED_ERROR_RATE: 0.1,
  UNHEALTHY_ERROR_RATE: 0.3,

  // State transitions map (what event to emit when state changes)
  STATE_EVENTS: {
    [`${MarketplaceHealthState.UNHEALTHY}_${MarketplaceHealthState.HEALTHY}`]: 'marketplace-health-restored',
    [`${MarketplaceHealthState.OFFLINE}_${MarketplaceHealthState.HEALTHY}`]: 'marketplace-health-restored',
    [`${MarketplaceHealthState.DEGRADED}_${MarketplaceHealthState.HEALTHY}`]: 'marketplace-health-up',
    [`${MarketplaceHealthState.HEALTHY}_${MarketplaceHealthState.DEGRADED}`]: 'marketplace-health-degraded',
    [`${MarketplaceHealthState.HEALTHY}_${MarketplaceHealthState.UNHEALTHY}`]: 'marketplace-health-down',
    [`${MarketplaceHealthState.HEALTHY}_${MarketplaceHealthState.OFFLINE}`]: 'marketplace-health-down',
    [`${MarketplaceHealthState.DEGRADED}_${MarketplaceHealthState.UNHEALTHY}`]: 'marketplace-health-down',
    [`${MarketplaceHealthState.DEGRADED}_${MarketplaceHealthState.OFFLINE}`]: 'marketplace-health-down',
  } as Record<string, string>,
} as const;

export const MP_HEALTH_QUEUE_CONFIG = {
  ATTEMPTS: 2,
  BACKOFF_MS: 3_000,
  REMOVE_ON_COMPLETE: 100,
  REMOVE_ON_FAIL: 50,
} as const;

export const MP_HEALTH_ERROR_CODES = {
  RECORD_NOT_FOUND: 'HEALTH_RECORD_NOT_FOUND',
  CHECK_FAILED: 'HEALTH_CHECK_FAILED',
  PROVIDER_NOT_REGISTERED: 'HEALTH_PROVIDER_NOT_REGISTERED',
  TIMEOUT: 'HEALTH_CHECK_TIMEOUT',
} as const;
