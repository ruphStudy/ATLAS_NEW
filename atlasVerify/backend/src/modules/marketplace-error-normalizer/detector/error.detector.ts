import { Injectable } from '@nestjs/common';
import {
  INormalizedError,
  ErrorType,
  ErrorCategory,
  UniversalErrorCode,
  IErrorClassification,
} from '../interfaces';

@Injectable()
export class ErrorDetector {
  classifyError(error: INormalizedError): IErrorClassification {
    const isTransient = this.isTransient(error);
    const isPermanent = this.isPermanent(error);
    const isDuplicate = this.isDuplicate(error);
    const isConflict = this.isConflict(error);
    const isPartialSuccess = error.type === ErrorType.PARTIAL_SUCCESS;

    const recommendedAction = this.getRecommendedAction(error);

    return {
      isTransient,
      isPermanent,
      isDuplicate,
      isConflict,
      isPartialSuccess,
      recommendedAction,
    };
  }

  private isTransient(error: INormalizedError): boolean {
    if (error.type === ErrorType.TRANSIENT) return true;

    const transientCategories = [
      ErrorCategory.NETWORK,
      ErrorCategory.TIMEOUT,
      ErrorCategory.RATE_LIMIT,
    ];

    if (transientCategories.includes(error.category)) {
      return true;
    }

    const transientCodes = [
      UniversalErrorCode.PROVIDER_UNAVAILABLE,
      UniversalErrorCode.SERVICE_UNAVAILABLE,
      UniversalErrorCode.NETWORK_ERROR,
      UniversalErrorCode.CONNECTION_ERROR,
      UniversalErrorCode.CONNECTION_TIMEOUT,
      UniversalErrorCode.TIMEOUT,
      UniversalErrorCode.REQUEST_TIMEOUT,
      UniversalErrorCode.OPERATION_TIMEOUT,
      UniversalErrorCode.RATE_LIMIT_EXCEEDED,
      UniversalErrorCode.QUOTA_EXCEEDED,
      UniversalErrorCode.THROTTLED,
      UniversalErrorCode.QUEUE_FULL,
    ];

    return transientCodes.includes(error.code);
  }

  private isPermanent(error: INormalizedError): boolean {
    if (error.type === ErrorType.PERMANENT) return true;

    const permanentCategories = [
      ErrorCategory.AUTHENTICATION,
      ErrorCategory.AUTHORIZATION,
      ErrorCategory.VALIDATION,
    ];

    if (permanentCategories.includes(error.category)) {
      return true;
    }

    const permanentCodes = [
      UniversalErrorCode.INVALID_CREDENTIALS,
      UniversalErrorCode.TOKEN_EXPIRED,
      UniversalErrorCode.TOKEN_INVALID,
      UniversalErrorCode.AUTHENTICATION_FAILED,
      UniversalErrorCode.AUTHORIZATION_FAILED,
      UniversalErrorCode.INSUFFICIENT_PERMISSIONS,
      UniversalErrorCode.VALIDATION_ERROR,
      UniversalErrorCode.INVALID_REQUEST,
      UniversalErrorCode.MISSING_REQUIRED_FIELD,
      UniversalErrorCode.INVALID_FIELD_VALUE,
      UniversalErrorCode.INVALID_FORMAT,
      UniversalErrorCode.RESOURCE_NOT_FOUND,
      UniversalErrorCode.OPERATION_NOT_SUPPORTED,
      UniversalErrorCode.CONFIGURATION_ERROR,
    ];

    return permanentCodes.includes(error.code);
  }

  private isDuplicate(error: INormalizedError): boolean {
    if (error.type === ErrorType.DUPLICATE) return true;

    const duplicateCodes = [
      UniversalErrorCode.RESOURCE_ALREADY_EXISTS,
      UniversalErrorCode.DUPLICATE_REQUEST,
    ];

    return duplicateCodes.includes(error.code);
  }

  private isConflict(error: INormalizedError): boolean {
    if (error.type === ErrorType.CONFLICT) return true;

    const conflictCodes = [
      UniversalErrorCode.RESOURCE_CONFLICT,
      UniversalErrorCode.BUSINESS_RULE_VIOLATION,
    ];

    return conflictCodes.includes(error.code);
  }

  private getRecommendedAction(error: INormalizedError): string {
    if (this.isTransient(error)) {
      if (error.retryAfter) {
        return `Retry after ${error.retryAfter / 1000} seconds`;
      }
      return 'Retry with exponential backoff';
    }

    if (this.isPermanent(error)) {
      if (error.category === ErrorCategory.AUTHENTICATION) {
        return 'Refresh credentials and retry';
      }
      if (error.category === ErrorCategory.VALIDATION) {
        return 'Fix validation errors and retry';
      }
      return 'Fix the underlying issue before retrying';
    }

    if (this.isDuplicate(error)) {
      return 'Check if resource already exists';
    }

    if (this.isConflict(error)) {
      return 'Resolve conflict and retry';
    }

    return 'Investigate and retry if appropriate';
  }

  shouldRetry(error: INormalizedError, attemptCount: number, maxAttempts: number = 3): boolean {
    if (attemptCount >= maxAttempts) {
      return false;
    }

    if (!error.isRetryable) {
      return false;
    }

    if (this.isPermanent(error)) {
      return false;
    }

    if (this.isTransient(error)) {
      return true;
    }

    return false;
  }

  calculateBackoff(
    error: INormalizedError,
    attemptCount: number,
    baseDelay: number = 1000,
  ): number {
    if (error.retryAfter) {
      return error.retryAfter;
    }

    if (error.category === ErrorCategory.RATE_LIMIT) {
      // Longer backoff for rate limits
      return Math.min(baseDelay * Math.pow(2, attemptCount), 60000);
    }

    // Exponential backoff
    return Math.min(baseDelay * Math.pow(2, attemptCount - 1), 30000);
  }

  shouldSendToDeadLetter(
    error: INormalizedError,
    attemptCount: number,
    maxAttempts: number = 3,
  ): boolean {
    if (attemptCount < maxAttempts) {
      return false;
    }

    if (this.isPermanent(error)) {
      return true;
    }

    if (!error.isRetryable) {
      return true;
    }

    return true;
  }
}
