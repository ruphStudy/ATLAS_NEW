import { Logger } from '@nestjs/common';
import { ProviderErrorCode } from '../interfaces';

export class AdapterTimeoutError extends Error {
  constructor(
    public readonly providerCode: string,
    public readonly timeoutMs: number,
  ) {
    super(`Request to provider '${providerCode}' timed out after ${timeoutMs}ms`);
    this.name = 'AdapterTimeoutError';
  }
}

export class AdapterRetryExhaustedError extends Error {
  constructor(
    public readonly providerCode: string,
    public readonly attempts: number,
    public readonly lastErrorCode: ProviderErrorCode,
  ) {
    super(
      `All ${attempts} retry attempts exhausted for provider '${providerCode}'. Last error: ${lastErrorCode}`,
    );
    this.name = 'AdapterRetryExhaustedError';
  }
}

/**
 * Wraps a provider call with a timeout.
 * Rejects after `timeoutMs` with AdapterTimeoutError.
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  providerCode: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new AdapterTimeoutError(providerCode, timeoutMs)),
      timeoutMs,
    );
    operation().then(
      (result) => { clearTimeout(timer); resolve(result); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

export interface RetryOptions {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
  retryableErrorCodes: Set<ProviderErrorCode>;
  isRetryable?: (error: unknown) => boolean;
}

/**
 * Executes an operation with retry logic.
 * Only retries when the error is retryable according to the policy.
 */
export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions,
  providerCode: string,
  logger: Logger,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      const retryable = options.isRetryable
        ? options.isRetryable(error)
        : isRetryableByDefault(error, options.retryableErrorCodes);

      if (!retryable || attempt === options.maxAttempts) {
        throw error;
      }

      const delay = options.backoffMs * Math.pow(options.backoffMultiplier, attempt - 1);
      logger.warn(
        `[${providerCode}] Attempt ${attempt}/${options.maxAttempts} failed, retrying in ${delay}ms`,
      );
      await sleep(delay);
    }
  }
  throw lastError;
}

function isRetryableByDefault(error: unknown, retryableCodes: Set<ProviderErrorCode>): boolean {
  if (error instanceof AdapterTimeoutError) return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('timeout') || msg.includes('etimedout')) return true;
    if (msg.includes('econnrefused') || msg.includes('enotfound')) return true;
    if (msg.includes('rate limit') || msg.includes('429')) return true;
  }
  const raw = error as Record<string, unknown>;
  if (typeof raw?.['errorCode'] === 'string') {
    return retryableCodes.has(raw['errorCode'] as ProviderErrorCode);
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
