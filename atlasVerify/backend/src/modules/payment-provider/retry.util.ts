import { PROVIDER_REQUEST_MAX_RETRIES, PROVIDER_REQUEST_RETRY_DELAY_MS } from './constants';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Generic retry-with-backoff for transient provider failures (timeout/5xx) — no provider-specific logic, just the retry loop. */
export async function withProviderRetry<T>(fn: () => Promise<T>, isRetryable: (error: unknown) => boolean): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= PROVIDER_REQUEST_MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === PROVIDER_REQUEST_MAX_RETRIES || !isRetryable(error)) {
        throw error;
      }
      await sleep(PROVIDER_REQUEST_RETRY_DELAY_MS * (attempt + 1));
    }
  }

  throw lastError;
}
