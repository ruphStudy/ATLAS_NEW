import { Injectable, Logger } from '@nestjs/common';
import { MP_FACTORY_ERROR_CODES } from '../constants';

export class ProviderFactoryException extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryable: boolean,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ProviderFactoryException';
  }
}

interface NormalizedFactoryError {
  code: string;
  message: string;
  retryable: boolean;
  details?: unknown;
}

/**
 * Normalizes raw errors thrown during factory operations into
 * structured ProviderFactoryException instances.
 *
 * All raw error messages are sanitized — no credentials, tokens or
 * internal stack details are exposed to callers.
 */
@Injectable()
export class MarketplaceProviderFactoryErrorNormalizer {
  private readonly logger = new Logger(MarketplaceProviderFactoryErrorNormalizer.name);

  normalize(error: unknown, context?: string): NormalizedFactoryError {
    if (error instanceof ProviderFactoryException) {
      return { code: error.code, message: error.message, retryable: error.retryable, details: error.details };
    }

    const msg = error instanceof Error ? error.message : String(error);
    const lower = msg.toLowerCase();

    const ctx = context ? `[${context}]` : '';

    if (lower.includes('not registered') || lower.includes('not found')) {
      return { code: MP_FACTORY_ERROR_CODES.PROVIDER_NOT_FOUND, message: `Provider not found ${ctx}`, retryable: false };
    }
    if (lower.includes('disabled') || lower.includes('inactive')) {
      return { code: MP_FACTORY_ERROR_CODES.PROVIDER_DISABLED, message: `Provider is disabled ${ctx}`, retryable: false };
    }
    if (lower.includes('unsupported capability')) {
      return { code: MP_FACTORY_ERROR_CODES.UNSUPPORTED_CAPABILITY, message: `Unsupported capability ${ctx}`, retryable: false };
    }
    if (lower.includes('unsupported country')) {
      return { code: MP_FACTORY_ERROR_CODES.UNSUPPORTED_COUNTRY, message: `Unsupported country ${ctx}`, retryable: false };
    }
    if (lower.includes('unsupported region')) {
      return { code: MP_FACTORY_ERROR_CODES.UNSUPPORTED_REGION, message: `Unsupported region ${ctx}`, retryable: false };
    }
    if (lower.includes('credential') && lower.includes('expired')) {
      return { code: MP_FACTORY_ERROR_CODES.CREDENTIALS_EXPIRED, message: `Credentials have expired ${ctx}`, retryable: false };
    }
    if (lower.includes('credential')) {
      return { code: MP_FACTORY_ERROR_CODES.CREDENTIALS_MISSING, message: `Credential resolution failed ${ctx}`, retryable: true };
    }
    if (lower.includes('config') || lower.includes('configuration')) {
      return { code: MP_FACTORY_ERROR_CODES.CONFIG_MISSING, message: `Configuration resolution failed ${ctx}`, retryable: true };
    }
    if (lower.includes('timeout') || lower.includes('econnrefused') || lower.includes('network')) {
      return { code: MP_FACTORY_ERROR_CODES.INITIALIZATION_FAILURE, message: `Provider initialization failed ${ctx}`, retryable: true };
    }
    if (lower.includes('init')) {
      return { code: MP_FACTORY_ERROR_CODES.INITIALIZATION_FAILURE, message: `Provider initialization failed ${ctx}`, retryable: true };
    }
    if (lower.includes('fallback')) {
      return { code: MP_FACTORY_ERROR_CODES.FALLBACK_FAILURE, message: `All fallback providers failed ${ctx}`, retryable: false };
    }

    this.logger.debug(`Unclassified factory error: ${msg}`);
    return { code: MP_FACTORY_ERROR_CODES.DEPENDENCY_RESOLUTION_FAILURE, message: `Factory dependency resolution failed ${ctx}`, retryable: true };
  }

  wrap(error: unknown, context?: string): ProviderFactoryException {
    const normalized = this.normalize(error, context);
    return new ProviderFactoryException(
      normalized.code,
      normalized.message,
      normalized.retryable,
      normalized.details,
    );
  }
}
