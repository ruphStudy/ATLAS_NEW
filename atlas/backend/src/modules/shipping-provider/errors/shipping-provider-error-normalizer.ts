import { Injectable, Logger } from '@nestjs/common';
import { NormalizedShippingError, ShippingErrorCode, ShippingHealthStatus, ShippingProviderHealthResult } from '../interfaces';

/**
 * Normalizes provider-specific errors into a consistent ATLAS error model.
 * Each adapter calls this to convert raw SDK / HTTP errors.
 */
@Injectable()
export class ShippingProviderErrorNormalizer {
  private readonly logger = new Logger(ShippingProviderErrorNormalizer.name);

  normalize(error: unknown, providerKey: string): NormalizedShippingError {
    if (error instanceof ShippingNormalizedException) {
      return error.normalized;
    }

    const raw = error as Record<string, unknown>;
    let code = ShippingErrorCode.UNKNOWN;
    let message = 'An unknown shipping provider error occurred';

    if (error instanceof Error) {
      message = error.message;
      const msg = error.message.toLowerCase();
      if (msg.includes('timeout') || msg.includes('etimedout')) {
        code = ShippingErrorCode.TIMEOUT;
      } else if (msg.includes('rate limit') || msg.includes('429') || msg.includes('too many')) {
        code = ShippingErrorCode.RATE_LIMITED;
      } else if (msg.includes('unauthorized') || msg.includes('401') || msg.includes('auth')) {
        code = ShippingErrorCode.AUTH_FAILED;
      } else if (msg.includes('not found') || msg.includes('404')) {
        code = ShippingErrorCode.NOT_FOUND;
      } else if (msg.includes('unserviceable') || msg.includes('pincode') || msg.includes('out of service area')) {
        code = ShippingErrorCode.UNSERVICEABLE_ADDRESS;
      } else if (msg.includes('econnrefused') || msg.includes('enotfound') || msg.includes('network')) {
        code = ShippingErrorCode.NETWORK_ERROR;
      } else if (msg.includes('quota') || msg.includes('limit exceeded')) {
        code = ShippingErrorCode.QUOTA_EXCEEDED;
      } else if (msg.includes('parse') || msg.includes('json') || msg.includes('invalid response')) {
        code = ShippingErrorCode.PARSE_ERROR;
      }
    } else if (typeof raw['status'] === 'number') {
      const status = raw['status'] as number;
      if (status === 401 || status === 403) code = ShippingErrorCode.AUTH_FAILED;
      else if (status === 404) code = ShippingErrorCode.NOT_FOUND;
      else if (status === 422 || status === 400) code = ShippingErrorCode.INVALID_REQUEST;
      else if (status === 429) code = ShippingErrorCode.RATE_LIMITED;
      else if (status >= 500) code = ShippingErrorCode.PROVIDER_UNAVAILABLE;
      message = (raw['message'] as string) ?? `HTTP ${status}`;
    }

    this.logger.warn(`[${providerKey}] Normalized error: ${code} – ${message}`);

    return {
      code,
      message,
      providerKey,
      retryable: this.isRetryable(code),
      details: error instanceof Error ? { stack: error.stack } : error,
    };
  }

  isRetryable(code: ShippingErrorCode): boolean {
    return [
      ShippingErrorCode.TIMEOUT,
      ShippingErrorCode.NETWORK_ERROR,
      ShippingErrorCode.RATE_LIMITED,
      ShippingErrorCode.PROVIDER_UNAVAILABLE,
    ].includes(code);
  }

  toUnhealthyResult(providerKey: string, error: unknown, startedAt: number): ShippingProviderHealthResult {
    const normalized = this.normalize(error, providerKey);
    return {
      providerKey,
      status: ShippingHealthStatus.UNHEALTHY,
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
export class ShippingNormalizedException extends Error {
  constructor(public readonly normalized: NormalizedShippingError) {
    super(normalized.message);
    this.name = 'ShippingNormalizedException';
  }
}
