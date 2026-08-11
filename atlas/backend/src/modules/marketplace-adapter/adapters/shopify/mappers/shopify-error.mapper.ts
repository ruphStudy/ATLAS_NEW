import { Injectable } from '@nestjs/common';
import { IAdapterError } from '../../../interfaces';
import { SHOPIFY_ERROR_CODES } from '../constants/shopify.constants';

@Injectable()
export class ShopifyErrorMapper {
  mapError(error: any): IAdapterError {
    if (error.response?.data?.errors) {
      return this.mapGraphQLErrors(error);
    }

    const errorCode = error.code;
    const errorMessage = error.message;
    const statusCode = error.response?.status;

    return {
      code: this.normalizeErrorCode(errorCode, statusCode),
      message: this.sanitizeErrorMessage(errorMessage),
      providerCode: errorCode,
      providerMessage: errorMessage,
      statusCode,
      retryable: this.isRetryable(errorCode, statusCode),
      retryAfter: this.extractRetryAfter(error),
      metadata: this.extractErrorMetadata(error),
    };
  }

  private mapGraphQLErrors(error: any): IAdapterError {
    const graphqlErrors = error.response.data.errors;
    const firstError = graphqlErrors[0];

    const errorCode =
      firstError.extensions?.code || SHOPIFY_ERROR_CODES.INVALID_INPUT;
    const errorMessage = graphqlErrors
      .map((e: any) => e.message)
      .join('; ');

    return {
      code: this.normalizeErrorCode(errorCode, error.response?.status),
      message: this.sanitizeErrorMessage(errorMessage),
      providerCode: errorCode,
      providerMessage: errorMessage,
      statusCode: error.response?.status,
      retryable: this.isRetryable(errorCode, error.response?.status),
      retryAfter: this.extractRetryAfter(error),
      metadata: {
        graphqlErrors,
        cost: firstError.extensions?.cost,
      },
    };
  }

  private normalizeErrorCode(errorCode: string, statusCode?: number): string {
    if (!errorCode && statusCode) {
      return this.statusCodeToErrorCode(statusCode);
    }

    const codeMap: Record<string, string> = {
      [SHOPIFY_ERROR_CODES.THROTTLED]: 'RATE_LIMIT_EXCEEDED',
      [SHOPIFY_ERROR_CODES.ACCESS_DENIED]: 'ACCESS_DENIED',
      [SHOPIFY_ERROR_CODES.INVALID_TOKEN]: 'INVALID_TOKEN',
      [SHOPIFY_ERROR_CODES.RESOURCE_NOT_FOUND]: 'NOT_FOUND',
      [SHOPIFY_ERROR_CODES.INVALID_INPUT]: 'INVALID_REQUEST',
      [SHOPIFY_ERROR_CODES.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
      [SHOPIFY_ERROR_CODES.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
      [SHOPIFY_ERROR_CODES.INVALID_SHOP]: 'INVALID_REQUEST',
    };

    return codeMap[errorCode] || 'UNKNOWN_ERROR';
  }

  private statusCodeToErrorCode(statusCode: number): string {
    const statusMap: Record<number, string> = {
      400: 'INVALID_REQUEST',
      401: 'UNAUTHORIZED',
      402: 'SHOP_LOCKED',
      403: 'ACCESS_DENIED',
      404: 'NOT_FOUND',
      406: 'NOT_ACCEPTABLE',
      422: 'INVALID_REQUEST',
      423: 'SHOP_LOCKED',
      429: 'RATE_LIMIT_EXCEEDED',
      500: 'INTERNAL_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT',
    };

    return statusMap[statusCode] || 'UNKNOWN_ERROR';
  }

  private isRetryable(errorCode: string, statusCode?: number): boolean {
    const retryableCodes = [
      SHOPIFY_ERROR_CODES.THROTTLED,
      SHOPIFY_ERROR_CODES.INTERNAL_SERVER_ERROR,
      SHOPIFY_ERROR_CODES.SERVICE_UNAVAILABLE,
    ];

    const retryableStatusCodes = [429, 500, 502, 503, 504];

    if (errorCode && retryableCodes.includes(errorCode)) {
      return true;
    }

    if (statusCode && retryableStatusCodes.includes(statusCode)) {
      return true;
    }

    return false;
  }

  private extractRetryAfter(error: any): number | undefined {
    const retryAfterHeader =
      error.response?.headers?.['retry-after'] ||
      error.response?.headers?.['x-shopify-retry-after'];

    if (retryAfterHeader) {
      const parsed = parseFloat(retryAfterHeader);
      return isNaN(parsed) ? undefined : parsed * 1000;
    }

    const cost = error.response?.data?.errors?.[0]?.extensions?.cost;
    if (cost?.throttleStatus) {
      const { currentlyAvailable, restoreRate } = cost.throttleStatus;
      if (currentlyAvailable < 10 && restoreRate > 0) {
        return Math.ceil((10 - currentlyAvailable) / restoreRate) * 1000;
      }
    }

    return undefined;
  }

  private extractErrorMetadata(error: any): Record<string, any> | undefined {
    const metadata: Record<string, any> = {};

    if (error.response?.headers?.['x-request-id']) {
      metadata.requestId = error.response.headers['x-request-id'];
    }

    if (error.response?.headers?.['x-shopify-shop-api-call-limit']) {
      metadata.apiCallLimit =
        error.response.headers['x-shopify-shop-api-call-limit'];
    }

    const cost = error.response?.data?.extensions?.cost;
    if (cost) {
      metadata.cost = cost;
    }

    return Object.keys(metadata).length > 0 ? metadata : undefined;
  }

  private sanitizeErrorMessage(message: string): string {
    if (!message) {
      return 'An unknown error occurred';
    }

    const sensitivePatterns = [
      /access[_-]?token[=:]\s*[\w-]+/gi,
      /password[=:]\s*[\w-]+/gi,
      /api[_-]?key[=:]\s*[\w-]+/gi,
      /secret[=:]\s*[\w-]+/gi,
      /x-shopify-access-token[=:]\s*[\w-]+/gi,
    ];

    let sanitized = message;

    for (const pattern of sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    return sanitized;
  }
}
