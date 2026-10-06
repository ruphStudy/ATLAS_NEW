import { Injectable } from '@nestjs/common';
import { IAdapterError } from '../../../interfaces';
import { EBAY_ERROR_CODES } from '../constants/ebay.constants';

@Injectable()
export class EbayErrorMapper {
  mapError(error: any): IAdapterError {
    const ebayError = error.response?.data?.errors?.[0];
    const errorCode = ebayError?.errorId || error.code;
    const errorMessage = ebayError?.message || error.message;
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
      '1001': 'INVALID_REQUEST',
      '1002': 'INVALID_REQUEST',
      '1100': 'UNAUTHORIZED',
      '1200': 'ACCESS_DENIED',
      '2001': 'NOT_FOUND',
      '2010': 'NOT_FOUND',
      '3001': 'RATE_LIMIT_EXCEEDED',
      '5000': 'INTERNAL_ERROR',
      '5001': 'SERVICE_UNAVAILABLE',
      INVALID_TOKEN: 'INVALID_TOKEN',
      EXPIRED_TOKEN: 'INVALID_TOKEN',
      INVALID_SKU: 'INVALID_REQUEST',
      INVALID_OFFER: 'INVALID_REQUEST',
      INSUFFICIENT_PERMISSIONS: 'ACCESS_DENIED',
      BUSINESS_ERROR: 'INVALID_REQUEST',
    };

    return codeMap[errorCode] || this.categorizeByErrorId(errorCode);
  }

  private categorizeByErrorId(errorId: string): string {
    if (!errorId) {
      return 'UNKNOWN_ERROR';
    }

    const id = String(errorId);

    if (id.startsWith('1')) {
      return 'INVALID_REQUEST';
    }

    if (id.startsWith('2')) {
      return 'NOT_FOUND';
    }

    if (id.startsWith('3')) {
      return 'RATE_LIMIT_EXCEEDED';
    }

    if (id.startsWith('5')) {
      return 'INTERNAL_ERROR';
    }

    return 'UNKNOWN_ERROR';
  }

  private statusCodeToErrorCode(statusCode: number): string {
    const statusMap: Record<number, string> = {
      400: 'INVALID_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'ACCESS_DENIED',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      429: 'RATE_LIMIT_EXCEEDED',
      500: 'INTERNAL_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT',
    };

    return statusMap[statusCode] || 'UNKNOWN_ERROR';
  }

  private isRetryable(errorCode: string, statusCode?: number): boolean {
    const retryableCodes = ['3001', 'RATE_LIMIT_EXCEEDED'];

    const retryableStatusCodes = [429, 500, 502, 503, 504];

    if (errorCode && retryableCodes.includes(errorCode)) {
      return true;
    }

    if (statusCode && retryableStatusCodes.includes(statusCode)) {
      return true;
    }

    if (errorCode && String(errorCode).startsWith('5')) {
      return true;
    }

    return false;
  }

  private extractRetryAfter(error: any): number | undefined {
    const retryAfterHeader =
      error.response?.headers?.['retry-after'] ||
      error.response?.headers?.['x-ebay-enforcements-retry-after'];

    if (retryAfterHeader) {
      const parsed = parseInt(retryAfterHeader, 10);
      return isNaN(parsed) ? undefined : parsed;
    }

    return undefined;
  }

  private extractErrorMetadata(error: any): Record<string, any> | undefined {
    const metadata: Record<string, any> = {};

    if (error.response?.data?.errors) {
      metadata.errors = error.response.data.errors.map((e: any) => ({
        errorId: e.errorId,
        domain: e.domain,
        category: e.category,
        message: e.message,
        longMessage: e.longMessage,
        parameters: e.parameters,
      }));
    }

    if (error.response?.data?.warnings) {
      metadata.warnings = error.response.data.warnings;
    }

    if (error.response?.headers?.['x-ebay-c-request-id']) {
      metadata.requestId = error.response.headers['x-ebay-c-request-id'];
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
