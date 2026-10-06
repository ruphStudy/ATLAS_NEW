import { Injectable } from '@nestjs/common';
import { ErrorMapper } from '../mapper/error.mapper';
import { ErrorDetector } from '../detector/error.detector';
import {
  INormalizedError,
  IProviderError,
  IItemError,
  IBulkErrorResponse,
  ErrorType,
  UniversalErrorCode,
  ErrorCategory,
  SafeErrorResponse,
  InternalErrorResponse,
  UserFacingErrorResponse,
} from '../interfaces';

@Injectable()
export class ErrorNormalizer {
  constructor(
    private readonly errorMapper: ErrorMapper,
    private readonly errorDetector: ErrorDetector,
  ) {}

  normalize(
    providerError: IProviderError,
    context?: {
      workspaceId?: string;
      provider?: string;
      accountId?: string;
      module?: string;
      operation?: string;
      resourceId?: string;
    },
  ): INormalizedError {
    const mapping = this.errorMapper.mapProviderError(providerError);
    const retryAfter = this.errorMapper.extractRetryAfter(providerError);
    const sanitizedMetadata = this.errorMapper.sanitizeMetadata(
      providerError.metadata,
    );

    const normalizedError: INormalizedError = {
      code: mapping.code,
      category: mapping.category,
      severity: mapping.severity,
      type: this.determineErrorType(mapping.code, mapping.category),
      message: this.buildInternalMessage(providerError, mapping.code),
      userMessage: mapping.userMessage,
      isRetryable: mapping.isRetryable,
      retryAfter,
      providerError: {
        providerCode: providerError.providerCode,
        providerMessage: providerError.providerMessage,
        httpStatus: providerError.httpStatus,
        requestId: providerError.requestId,
        traceId: providerError.traceId,
        timestamp: providerError.timestamp || new Date(),
        metadata: sanitizedMetadata,
      },
      context,
      timestamp: new Date(),
    };

    return normalizedError;
  }

  normalizeException(
    error: Error,
    context?: {
      workspaceId?: string;
      provider?: string;
      accountId?: string;
      module?: string;
      operation?: string;
      resourceId?: string;
    },
  ): INormalizedError {
    const providerError: IProviderError = {
      providerMessage: error.message,
      timestamp: new Date(),
      metadata: {
        name: error.name,
        stack: error.stack,
      },
    };

    return this.normalize(providerError, context);
  }

  normalizeHttpError(
    status: number,
    message: string,
    data?: any,
    context?: {
      workspaceId?: string;
      provider?: string;
      accountId?: string;
      module?: string;
      operation?: string;
      resourceId?: string;
    },
  ): INormalizedError {
    const providerError: IProviderError = {
      httpStatus: status,
      providerMessage: message,
      timestamp: new Date(),
      metadata: data,
    };

    return this.normalize(providerError, context);
  }

  normalizeBulkErrors(
    totalItems: number,
    itemErrors: IItemError[],
  ): IBulkErrorResponse {
    const failureCount = itemErrors.length;
    const successCount = totalItems - failureCount;
    const partialSuccess = successCount > 0 && failureCount > 0;

    return {
      totalItems,
      successCount,
      failureCount,
      errors: itemErrors,
      partialSuccess,
    };
  }

  toSafeResponse(error: INormalizedError): SafeErrorResponse {
    return {
      code: error.code,
      message: error.message,
      category: error.category,
      severity: error.severity,
      isRetryable: error.isRetryable,
      retryAfter: error.retryAfter,
      requestId: error.providerError?.requestId,
      timestamp: error.timestamp,
    };
  }

  toInternalResponse(error: INormalizedError): InternalErrorResponse {
    return {
      code: error.code,
      message: error.message,
      category: error.category,
      severity: error.severity,
      isRetryable: error.isRetryable,
      retryAfter: error.retryAfter,
      requestId: error.providerError?.requestId,
      providerCode: error.providerError?.providerCode,
      providerMessage: error.providerError?.providerMessage,
      httpStatus: error.providerError?.httpStatus,
      traceId: error.providerError?.traceId,
      context: error.context as Record<string, any>,
      timestamp: error.timestamp,
    };
  }

  toUserFacingResponse(error: INormalizedError): UserFacingErrorResponse {
    const classification = this.errorDetector.classifyError(error);

    return {
      message: error.userMessage || 'An error occurred. Please try again.',
      code: error.code,
      canRetry: error.isRetryable,
      suggestedAction: classification.recommendedAction,
    };
  }

  private determineErrorType(
    code: UniversalErrorCode,
    category: ErrorCategory,
  ): ErrorType {
    const transientCategories = [
      ErrorCategory.NETWORK,
      ErrorCategory.TIMEOUT,
      ErrorCategory.RATE_LIMIT,
    ];

    if (transientCategories.includes(category)) {
      return ErrorType.TRANSIENT;
    }

    if (
      code === UniversalErrorCode.RESOURCE_ALREADY_EXISTS ||
      code === UniversalErrorCode.DUPLICATE_REQUEST
    ) {
      return ErrorType.DUPLICATE;
    }

    if (code === UniversalErrorCode.RESOURCE_CONFLICT) {
      return ErrorType.CONFLICT;
    }

    const permanentCategories = [
      ErrorCategory.AUTHENTICATION,
      ErrorCategory.AUTHORIZATION,
      ErrorCategory.VALIDATION,
    ];

    if (permanentCategories.includes(category)) {
      return ErrorType.PERMANENT;
    }

    return ErrorType.PERMANENT;
  }

  private buildInternalMessage(
    providerError: IProviderError,
    code: UniversalErrorCode,
  ): string {
    if (providerError.providerMessage) {
      return providerError.providerMessage;
    }

    if (providerError.httpStatus) {
      return `HTTP ${providerError.httpStatus}: ${code}`;
    }

    return code;
  }
}
