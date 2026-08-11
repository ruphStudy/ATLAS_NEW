import { Injectable } from '@nestjs/common';
import {
  UniversalErrorCode,
  ErrorCategory,
  ErrorSeverity,
  IErrorMapping,
  IProviderError,
} from '../interfaces';

@Injectable()
export class ErrorMapper {
  private readonly mappings: IErrorMapping[] = [
    // Authentication errors
    {
      providerPattern: /unauthorized|401|invalid.*token|token.*expired/i,
      universalCode: UniversalErrorCode.INVALID_CREDENTIALS,
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.HIGH,
      isRetryable: false,
      userMessage: 'Authentication failed. Please check your credentials.',
    },
    {
      providerPattern: /forbidden|403|insufficient.*permission/i,
      universalCode: UniversalErrorCode.AUTHORIZATION_FAILED,
      category: ErrorCategory.AUTHORIZATION,
      severity: ErrorSeverity.HIGH,
      isRetryable: false,
      userMessage: 'You do not have permission to perform this action.',
    },
    
    // Rate limit errors
    {
      providerPattern: /rate.*limit|429|throttle|quota.*exceed/i,
      universalCode: UniversalErrorCode.RATE_LIMIT_EXCEEDED,
      category: ErrorCategory.RATE_LIMIT,
      severity: ErrorSeverity.MEDIUM,
      isRetryable: true,
      userMessage: 'Request limit exceeded. Please try again later.',
    },
    
    // Network errors
    {
      providerPattern: /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|network.*error|connection.*failed/i,
      universalCode: UniversalErrorCode.NETWORK_ERROR,
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      isRetryable: true,
      userMessage: 'Network error occurred. Please try again.',
    },
    
    // Timeout errors
    {
      providerPattern: /timeout|timed.*out|ESOCKETTIMEDOUT/i,
      universalCode: UniversalErrorCode.TIMEOUT,
      category: ErrorCategory.TIMEOUT,
      severity: ErrorSeverity.MEDIUM,
      isRetryable: true,
      userMessage: 'Request timed out. Please try again.',
    },
    
    // Validation errors
    {
      providerPattern: /validation|invalid.*field|missing.*field|400|bad.*request/i,
      universalCode: UniversalErrorCode.VALIDATION_ERROR,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      isRetryable: false,
      userMessage: 'Invalid request. Please check your input.',
    },
    
    // Business errors
    {
      providerPattern: /not.*found|404/i,
      universalCode: UniversalErrorCode.RESOURCE_NOT_FOUND,
      category: ErrorCategory.BUSINESS,
      severity: ErrorSeverity.LOW,
      isRetryable: false,
      userMessage: 'Resource not found.',
    },
    {
      providerPattern: /already.*exists|conflict|409|duplicate/i,
      universalCode: UniversalErrorCode.RESOURCE_ALREADY_EXISTS,
      category: ErrorCategory.BUSINESS,
      severity: ErrorSeverity.LOW,
      isRetryable: false,
      userMessage: 'Resource already exists.',
    },
    {
      providerPattern: /out.*of.*stock|insufficient.*stock/i,
      universalCode: UniversalErrorCode.INSUFFICIENT_STOCK,
      category: ErrorCategory.BUSINESS,
      severity: ErrorSeverity.MEDIUM,
      isRetryable: false,
      userMessage: 'Insufficient stock available.',
    },
    
    // Provider errors
    {
      providerPattern: /503|service.*unavailable|temporarily.*unavailable/i,
      universalCode: UniversalErrorCode.PROVIDER_UNAVAILABLE,
      category: ErrorCategory.PROVIDER,
      severity: ErrorSeverity.HIGH,
      isRetryable: true,
      userMessage: 'Service temporarily unavailable. Please try again later.',
    },
    {
      providerPattern: /500|internal.*server.*error/i,
      universalCode: UniversalErrorCode.INTERNAL_ERROR,
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.CRITICAL,
      isRetryable: true,
      userMessage: 'An internal error occurred. Please try again later.',
    },
  ];

  mapProviderError(
    providerError: IProviderError,
    defaultCode: UniversalErrorCode = UniversalErrorCode.UNKNOWN_ERROR,
  ): {
    code: UniversalErrorCode;
    category: ErrorCategory;
    severity: ErrorSeverity;
    isRetryable: boolean;
    userMessage?: string;
  } {
    const errorText = this.buildErrorText(providerError);

    for (const mapping of this.mappings) {
      if (this.matchesPattern(errorText, mapping.providerPattern)) {
        return {
          code: mapping.universalCode,
          category: mapping.category,
          severity: mapping.severity,
          isRetryable: mapping.isRetryable,
          userMessage: mapping.userMessage,
        };
      }
    }

    // Check HTTP status code
    if (providerError.httpStatus) {
      const statusMapping = this.mapHttpStatus(providerError.httpStatus);
      if (statusMapping) {
        return statusMapping;
      }
    }

    // Default mapping
    return {
      code: defaultCode,
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      isRetryable: false,
      userMessage: 'An error occurred. Please try again.',
    };
  }

  private buildErrorText(providerError: IProviderError): string {
    const parts: string[] = [];

    if (providerError.providerCode) {
      parts.push(providerError.providerCode);
    }

    if (providerError.providerMessage) {
      parts.push(providerError.providerMessage);
    }

    if (providerError.httpStatus) {
      parts.push(providerError.httpStatus.toString());
    }

    return parts.join(' ');
  }

  private matchesPattern(text: string, pattern: string | RegExp): boolean {
    if (typeof pattern === 'string') {
      return text.toLowerCase().includes(pattern.toLowerCase());
    }
    return pattern.test(text);
  }

  private mapHttpStatus(status: number): {
    code: UniversalErrorCode;
    category: ErrorCategory;
    severity: ErrorSeverity;
    isRetryable: boolean;
    userMessage?: string;
  } | null {
    if (status >= 500) {
      return {
        code: UniversalErrorCode.INTERNAL_ERROR,
        category: ErrorCategory.SYSTEM,
        severity: ErrorSeverity.CRITICAL,
        isRetryable: true,
        userMessage: 'Service error occurred. Please try again later.',
      };
    }

    if (status === 429) {
      return {
        code: UniversalErrorCode.RATE_LIMIT_EXCEEDED,
        category: ErrorCategory.RATE_LIMIT,
        severity: ErrorSeverity.MEDIUM,
        isRetryable: true,
        userMessage: 'Rate limit exceeded. Please try again later.',
      };
    }

    if (status === 409) {
      return {
        code: UniversalErrorCode.RESOURCE_CONFLICT,
        category: ErrorCategory.BUSINESS,
        severity: ErrorSeverity.LOW,
        isRetryable: false,
        userMessage: 'Resource conflict detected.',
      };
    }

    if (status === 404) {
      return {
        code: UniversalErrorCode.RESOURCE_NOT_FOUND,
        category: ErrorCategory.BUSINESS,
        severity: ErrorSeverity.LOW,
        isRetryable: false,
        userMessage: 'Resource not found.',
      };
    }

    if (status === 403) {
      return {
        code: UniversalErrorCode.AUTHORIZATION_FAILED,
        category: ErrorCategory.AUTHORIZATION,
        severity: ErrorSeverity.HIGH,
        isRetryable: false,
        userMessage: 'Access denied.',
      };
    }

    if (status === 401) {
      return {
        code: UniversalErrorCode.INVALID_CREDENTIALS,
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.HIGH,
        isRetryable: false,
        userMessage: 'Authentication failed.',
      };
    }

    if (status === 400) {
      return {
        code: UniversalErrorCode.VALIDATION_ERROR,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        isRetryable: false,
        userMessage: 'Invalid request.',
      };
    }

    return null;
  }

  extractRetryAfter(providerError: IProviderError): number | undefined {
    // Check metadata for retry-after header
    if (providerError.metadata?.['retry-after']) {
      const retryAfter = providerError.metadata['retry-after'];
      if (typeof retryAfter === 'number') {
        return retryAfter * 1000; // Convert to ms
      }
      if (typeof retryAfter === 'string') {
        const parsed = parseInt(retryAfter, 10);
        if (!isNaN(parsed)) {
          return parsed * 1000;
        }
      }
    }

    // Check provider message for retry hints
    const message = providerError.providerMessage?.toLowerCase() || '';
    const retryMatch = message.match(/retry.*?(\d+).*?(second|minute|hour)/i);
    if (retryMatch) {
      const value = parseInt(retryMatch[1], 10);
      const unit = retryMatch[2].toLowerCase();

      if (unit === 'second') return value * 1000;
      if (unit === 'minute') return value * 60 * 1000;
      if (unit === 'hour') return value * 60 * 60 * 1000;
    }

    return undefined;
  }

  sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) return undefined;

    const sanitized: Record<string, any> = {};
    const sensitiveKeys = [
      'authorization',
      'auth',
      'token',
      'secret',
      'password',
      'key',
      'credential',
      'api_key',
      'access_token',
      'refresh_token',
    ];

    for (const [key, value] of Object.entries(metadata)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some((sk) => lowerKey.includes(sk));

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeMetadata(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
