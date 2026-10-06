/**
 * IAiTimeoutPolicy
 */
export interface IAiTimeoutPolicy {
  requestTimeoutMs: number;
  connectTimeoutMs?: number;
}

/**
 * IAiRetryPolicy
 */
export interface IAiRetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier?: number;
  retryableErrorCodes?: string[];
}

/**
 * IAiRateLimitPolicy
 */
export interface IAiRateLimitPolicy {
  maxRequestsPerMinute?: number;
  maxTokensPerMinute?: number;
  maxConcurrentRequests?: number;
}

/**
 * IAiFallbackPolicy
 *
 * `fallbackProviderKeys` is evaluated in order; the first provider that is
 * registered, enabled and supports the requested capability is used.
 */
export interface IAiFallbackPolicy {
  fallbackProviderKeys: string[];
  fallbackOnErrorCodes?: string[];
}
