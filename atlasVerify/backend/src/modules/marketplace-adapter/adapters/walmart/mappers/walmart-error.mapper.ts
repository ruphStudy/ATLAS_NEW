import { Injectable } from '@nestjs/common';
import { IAdapterError } from '../../../interfaces';
import { WALMART_ERROR_CODES } from '../constants/walmart.constants';

@Injectable()
export class WalmartErrorMapper {
  mapError(error: any): IAdapterError {
    const errorCode =
      error.response?.data?.error?.code ||
      error.response?.data?.errors?.[0]?.code ||
      error.code;
    const errorMessage =
      error.response?.data?.error?.message ||
      error.response?.data?.errors?.[0]?.message ||
      error.message;
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
      [WALMART_ERROR_CODES.INVALID_REQUEST]: 'INVALID_REQUEST',
      [WALMART_ERROR_CODES.UNAUTHORIZED]: 'UNAUTHORIZED',
      [WALMART_ERROR_CODES.FORBIDDEN]: 'ACCESS_DENIED',
      [WALMART_ERROR_CODES.NOT_FOUND]: 'NOT_FOUND',
      [WALMART_ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'RATE_LIMIT_EXCEEDED',
      [WALMART_ERROR_CODES.INTERNAL_ERROR]: 'INTERNAL_ERROR',
      [WALMART_ERROR_CODES.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
      [WALMART_ERROR_CODES.INVALID_TOKEN]: 'INVALID_TOKEN',
      [WALMART_ERROR_CODES.EXPIRED_TOKEN]: 'INVALID_TOKEN',
      [WALMART_ERROR_CODES.INVALID_SKU]: 'INVALID_REQUEST',
      [WALMART_ERROR_CODES.INVALID_ORDER]: 'INVALID_REQUEST',
      [WALMART_ERROR_CODES.ITEM_NOT_FOUND]: 'NOT_FOUND',
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
    const retryableCodes = [
      WALMART_ERROR_CODES.RATE_LIMIT_EXCEEDED,
      WALMART_ERROR_CODES.INTERNAL_ERROR,
      WALMART_ERROR_CODES.SERVICE_UNAVAILABLE,
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
      error.response?.headers?.['x-retry-after'];

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

    if (error.response?.headers?.['wm_qos.correlation_id']) {
      metadata.correlationId =
        error.response.headers['wm_qos.correlation_id'];
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
      /api[_-]?key[=:]\s*[\w-]+/gi,
      /password[=:]\s*[\w-]+/gi,
      /bearer[=:]\s*[\w-]+/gi,
    ];

    let sanitized = message;

    for (const pattern of sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    return sanitized;
  }
}
