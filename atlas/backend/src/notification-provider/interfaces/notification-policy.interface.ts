/** Mirrors src/ai/interfaces/ai-policy.interface.ts, renamed for notification providers. */

export interface INotificationTimeoutPolicy {
  requestTimeoutMs: number;
  connectTimeoutMs?: number;
}

export interface INotificationRetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier?: number;
  retryableErrorCodes?: string[];
}

export interface INotificationRateLimitPolicy {
  maxRequestsPerMinute?: number;
  maxConcurrentRequests?: number;
}

export interface INotificationFallbackPolicy {
  fallbackProviderKeys: string[];
  fallbackOnErrorCodes?: string[];
}
