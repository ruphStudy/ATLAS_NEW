import { Injectable, Logger } from '@nestjs/common';
import {
  NormalizedProviderError,
  ProviderErrorCode,
  ProviderHealthResult,
  ProviderHealthStatus,
  SupplierProviderCode,
} from '../interfaces';

/**
 * Normalizes provider-specific errors into a consistent ATLAS error model.
 * Each adapter calls this to convert raw SDK / HTTP errors.
 */
@Injectable()
export class ProviderErrorNormalizer {
  private readonly logger = new Logger(ProviderErrorNormalizer.name);

  normalize(
    error: unknown,
    providerCode: SupplierProviderCode,
  ): NormalizedProviderError {
    if (error instanceof ProviderNormalizedException) {
      return error.normalized;
    }

    const raw = error as Record<string, unknown>;
    let code = ProviderErrorCode.UNKNOWN;
    let message = 'An unknown provider error occurred';

    if (error instanceof Error) {
      message = error.message;

      const msg = error.message.toLowerCase();
      if (msg.includes('timeout') || msg.includes('etimedout')) {
        code = ProviderErrorCode.TIMEOUT;
      } else if (msg.includes('rate limit') || msg.includes('429') || msg.includes('too many')) {
        code = ProviderErrorCode.RATE_LIMITED;
      } else if (msg.includes('unauthorized') || msg.includes('401') || msg.includes('auth')) {
        code = ProviderErrorCode.AUTH_FAILED;
      } else if (msg.includes('not found') || msg.includes('404')) {
        code = ProviderErrorCode.NOT_FOUND;
      } else if (msg.includes('econnrefused') || msg.includes('enotfound') || msg.includes('network')) {
        code = ProviderErrorCode.NETWORK_ERROR;
      } else if (msg.includes('quota') || msg.includes('limit exceeded')) {
        code = ProviderErrorCode.QUOTA_EXCEEDED;
      } else if (msg.includes('parse') || msg.includes('json') || msg.includes('invalid response')) {
        code = ProviderErrorCode.PARSE_ERROR;
      }
    } else if (typeof raw['status'] === 'number') {
      const status = raw['status'] as number;
      if (status === 401 || status === 403) code = ProviderErrorCode.AUTH_FAILED;
      else if (status === 404) code = ProviderErrorCode.NOT_FOUND;
      else if (status === 422 || status === 400) code = ProviderErrorCode.INVALID_REQUEST;
      else if (status === 429) code = ProviderErrorCode.RATE_LIMITED;
      else if (status >= 500) code = ProviderErrorCode.PROVIDER_UNAVAILABLE;
      message = (raw['message'] as string) ?? `HTTP ${status}`;
    }

    this.logger.warn(`[${providerCode}] Normalized error: ${code} – ${message}`);

    return {
      code,
      message,
      providerCode,
      retryable: this.isRetryable(code),
      details: error instanceof Error ? { stack: error.stack } : error,
    };
  }

  isRetryable(code: ProviderErrorCode): boolean {
    return [
      ProviderErrorCode.TIMEOUT,
      ProviderErrorCode.NETWORK_ERROR,
      ProviderErrorCode.RATE_LIMITED,
      ProviderErrorCode.PROVIDER_UNAVAILABLE,
    ].includes(code);
  }

  toUnhealthyResult(
    providerCode: SupplierProviderCode,
    error: unknown,
    startedAt: number,
  ): ProviderHealthResult {
    const normalized = this.normalize(error, providerCode);
    return {
      providerCode,
      status: ProviderHealthStatus.UNHEALTHY,
      latencyMs: Date.now() - startedAt,
      message: normalized.message,
      checkedAt: new Date(),
      details: { errorCode: normalized.code },
    };
  }
}

/**
 * Wrap a normalized error to short-circuit re-normalization.
 */
export class ProviderNormalizedException extends Error {
  constructor(public readonly normalized: NormalizedProviderError) {
    super(normalized.message);
    this.name = 'ProviderNormalizedException';
  }
}
