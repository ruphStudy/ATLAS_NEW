import { Injectable } from '@nestjs/common';
import { IAdapterError } from '../../../interfaces';
import { AMAZON_ERROR_CODES } from '../constants/amazon.constants';

@Injectable()
export class AmazonErrorMapper {
  mapError(error: any): IAdapterError {
    const errorCode = error.response?.data?.errors?.[0]?.code || error.code;
    const errorMessage =
      error.response?.data?.errors?.[0]?.message || error.message;
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

  private normalizeErrorCode(errorCode: string, statusCode?: number): string {
    if (!errorCode && statusCode) {
      return this.statusCodeToErrorCode(statusCode);
    }

    const codeMap: Record<string, string> = {
      [AMAZON_ERROR_CODES.INVALID_INPUT]: 'INVALID_REQUEST',
      [AMAZON_ERROR_CODES.UNAUTHORIZED]: 'UNAUTHORIZED',
      [AMAZON_ERROR_CODES.ACCESS_DENIED]: 'ACCESS_DENIED',
      [AMAZON_ERROR_CODES.INVALID_ACCESS_TOKEN]: 'INVALID_TOKEN',
      [AMAZON_ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'RATE_LIMIT_EXCEEDED',
      [AMAZON_ERROR_CODES.REQUEST_THROTTLED]: 'RATE_LIMIT_EXCEEDED',
      [AMAZON_ERROR_CODES.INTERNAL_ERROR]: 'INTERNAL_ERROR',
      [AMAZON_ERROR_CODES.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
      [AMAZON_ERROR_CODES.INVALID_PARAMETER]: 'INVALID_REQUEST',
      [AMAZON_ERROR_CODES.RESOURCE_NOT_FOUND]: 'NOT_FOUND',
      [AMAZON_ERROR_CODES.INVALID_ASIN]: 'INVALID_REQUEST',
      [AMAZON_ERROR_CODES.INVALID_ORDER_ID]: 'INVALID_REQUEST',
    };

    return codeMap[errorCode] || 'UNKNOWN_ERROR';
  }

  private statusCodeToErrorCode(statusCode: number): string {
    const statusMap: Record<number, string> = {
      400: 'INVALID_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'ACCESS_DENIED',
      404: 'NOT_FOUND',
      429: 'RATE_LIMIT_EXCEEDED',
      500: 'INTERNAL_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT',
    };

    return statusMap[statusCode] || 'UNKNOWN_ERROR';
  }

  private isRetryable(errorCode: string, statusCode?: number): boolean {
    const retryableCodes: string[] = [
      AMAZON_ERROR_CODES.RATE_LIMIT_EXCEEDED,
      AMAZON_ERROR_CODES.REQUEST_THROTTLED,
      AMAZON_ERROR_CODES.INTERNAL_ERROR,
      AMAZON_ERROR_CODES.SERVICE_UNAVAILABLE,
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
      error.response?.headers?.['x-amzn-retry-after'];

    if (retryAfterHeader) {
      const parsed = parseInt(retryAfterHeader, 10);
      return isNaN(parsed) ? undefined : parsed;
    }

    return undefined;
  }

  private extractErrorMetadata(error: any): Record<string, any> | undefined {
    const metadata: Record<string, any> = {};

    if (error.response?.data?.errors) {
      metadata.errors = error.response.data.errors;
    }

    if (error.response?.headers?.['x-amzn-requestid']) {
      metadata.amazonRequestId = error.response.headers['x-amzn-requestid'];
    }

    if (error.response?.headers?.['x-amzn-ratelimit-limit']) {
      metadata.rateLimit = {
        limit: error.response.headers['x-amzn-ratelimit-limit'],
        remaining: error.response.headers['x-amzn-ratelimit-remaining'],
      };
    }

    return Object.keys(metadata).length > 0 ? metadata : undefined;
  }

  private sanitizeErrorMessage(message: string): string {
    if (!message) {
      return 'An unknown error occurred';
    }

    const sensitivePatterns = [
      /access[_-]?token[=:]\s*[\w-]+/gi,
      /client[_-]?secret[=:]\s*[\w-]+/gi,
      /refresh[_-]?token[=:]\s*[\w-]+/gi,
      /api[_-]?key[=:]\s*[\w-]+/gi,
      /seller[_-]?id[=:]\s*[\w-]+/gi,
    ];

    let sanitized = message;

    for (const pattern of sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    return sanitized;
  }
}
