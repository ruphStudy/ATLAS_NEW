/** Mirrors src/ai/constants/index.ts's AI_PROVIDER_DEFAULTS, renamed for notification providers. */
export const NOTIFICATION_PROVIDER_DEFAULTS = {
  REQUEST_TIMEOUT_MS: 30000,
  MAX_RETRY_ATTEMPTS: 2,
  RETRY_BACKOFF_MS: 500,
  RETRY_BACKOFF_MULTIPLIER: 2,
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_FALLBACK_HOPS: 3,
} as const;
