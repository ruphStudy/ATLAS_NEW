import { Injectable, Logger } from '@nestjs/common';
import {
  MarketplaceErrorCode,
  NormalizedMarketplaceError,
} from '../interfaces';
import { MARKETPLACE_PROVIDER_CONSTANTS } from '../constants';

export class MarketplaceNormalizedException extends Error {
  constructor(public readonly normalized: NormalizedMarketplaceError) {
    super(normalized.message);
    this.name = 'MarketplaceNormalizedException';
  }
}

/**
 * Normalizes all marketplace provider errors into ATLAS standard error models.
 * Classifies errors as retryable or non-retryable.
 * Never logs credential values or secrets.
 */
@Injectable()
export class MarketplaceErrorNormalizer {
  private readonly logger = new Logger(MarketplaceErrorNormalizer.name);

  normalize(error: unknown, providerKey: string): NormalizedMarketplaceError {
    if (error instanceof MarketplaceNormalizedException) {
      return error.normalized;
    }

    const raw = error as Record<string, unknown>;
    let code = MarketplaceErrorCode.UNKNOWN;
    let message = 'An unknown marketplace provider error occurred';

    if (error instanceof Error) {
      message = error.message;
      const msg = error.message.toLowerCase();

      if (msg.includes('timeout') || msg.includes('etimedout') || msg.includes('timed out')) {
        code = MarketplaceErrorCode.TIMEOUT;
      } else if (
        msg.includes('rate limit') ||
        msg.includes('429') ||
        msg.includes('too many requests') ||
        msg.includes('throttl')
      ) {
        code = MarketplaceErrorCode.RATE_LIMITED;
      } else if (
        msg.includes('unauthorized') ||
        msg.includes('401') ||
        msg.includes('invalid token') ||
        msg.includes('invalid credentials')
      ) {
        code = MarketplaceErrorCode.AUTH_FAILED;
      } else if (
        msg.includes('forbidden') ||
        msg.includes('403') ||
        msg.includes('permission denied')
      ) {
        code = MarketplaceErrorCode.AUTHORIZATION_FAILED;
      } else if (msg.includes('not found') || msg.includes('404')) {
        code = MarketplaceErrorCode.NOT_FOUND;
      } else if (
        msg.includes('econnrefused') ||
        msg.includes('enotfound') ||
        msg.includes('network error') ||
        msg.includes('dns')
      ) {
        code = MarketplaceErrorCode.NETWORK_ERROR;
      } else if (
        msg.includes('quota') ||
        msg.includes('limit exceeded') ||
        msg.includes('over limit')
      ) {
        code = MarketplaceErrorCode.QUOTA_EXCEEDED;
      } else if (
        msg.includes('parse') ||
        msg.includes('json') ||
        msg.includes('invalid response') ||
        msg.includes('unexpected token')
      ) {
        code = MarketplaceErrorCode.PARSE_ERROR;
      } else if (
        msg.includes('unsupported capability') ||
        msg.includes('not supported')
      ) {
        code = MarketplaceErrorCode.UNSUPPORTED_CAPABILITY;
      } else if (msg.includes('credential') && msg.includes('expir')) {
        code = MarketplaceErrorCode.CREDENTIALS_EXPIRED;
      } else if (msg.includes('suspended') || msg.includes('account suspended')) {
        code = MarketplaceErrorCode.ACCOUNT_SUSPENDED;
      } else if (
        msg.includes('validation') ||
        msg.includes('invalid field') ||
        msg.includes('422')
      ) {
        code = MarketplaceErrorCode.VALIDATION_ERROR;
      }
    } else if (typeof raw['status'] === 'number') {
      const status = raw['status'] as number;
      if (status === 401) code = MarketplaceErrorCode.AUTH_FAILED;
      else if (status === 403) code = MarketplaceErrorCode.AUTHORIZATION_FAILED;
      else if (status === 404) code = MarketplaceErrorCode.NOT_FOUND;
      else if (status === 422 || status === 400) code = MarketplaceErrorCode.VALIDATION_ERROR;
      else if (status === 429) code = MarketplaceErrorCode.RATE_LIMITED;
      else if (status >= 500) code = MarketplaceErrorCode.PROVIDER_UNAVAILABLE;
      message = (raw['message'] as string) ?? `HTTP ${status}`;
    }

    this.logger.warn(`[${providerKey}] Normalized error: ${code} – ${message}`);

    return {
      code,
      message,
      providerKey,
      retryable: this.isRetryable(code),
      details: error instanceof Error ? { name: error.name } : error,
    };
  }

  isRetryable(code: MarketplaceErrorCode): boolean {
    return MARKETPLACE_PROVIDER_CONSTANTS.RETRYABLE_ERROR_CODES.has(code);
  }

  wrap(error: unknown, providerKey: string): MarketplaceNormalizedException {
    return new MarketplaceNormalizedException(this.normalize(error, providerKey));
  }
}
