import { Injectable } from '@nestjs/common';
import { ErrorNormalizerRepository } from './repository/error-normalizer.repository';
import { ErrorNormalizer } from './normalizer/error.normalizer';
import { ErrorDetector } from './detector/error.detector';
import { ErrorEventQueue } from './events/error-event.queue';
import {
  INormalizedError,
  IProviderError,
  IErrorHistory,
  IErrorOccurrence,
  ErrorSearchCriteria,
  IErrorClassification,
  SafeErrorResponse,
  InternalErrorResponse,
  UserFacingErrorResponse,
} from './interfaces';

interface IErrorHistoryRow {
  id: string;
  occurrenceCount: number;
}

@Injectable()
export class MarketplaceErrorNormalizerService {
  constructor(
    private readonly repository: ErrorNormalizerRepository,
    private readonly normalizer: ErrorNormalizer,
    private readonly detector: ErrorDetector,
    private readonly eventQueue: ErrorEventQueue,
  ) {}

  async normalizeAndRecord(
    providerError: IProviderError,
    context?: {
      workspaceId?: string;
      provider?: string;
      accountId?: string;
      module?: string;
      operation?: string;
      resourceId?: string;
    },
  ): Promise<INormalizedError> {
    const normalizedError = this.normalizer.normalize(providerError, context);

    if (context?.workspaceId && context?.provider) {
      await this.recordError(normalizedError);

      await this.eventQueue.publish({
        eventType: 'error.normalized',
        workspaceId: context.workspaceId,
        provider: context.provider,
        accountId: context.accountId,
        module: context.module,
        error: normalizedError,
        timestamp: new Date(),
      });
    }

    return normalizedError;
  }

  async normalizeException(
    error: Error,
    context?: {
      workspaceId?: string;
      provider?: string;
      accountId?: string;
      module?: string;
      operation?: string;
      resourceId?: string;
    },
  ): Promise<INormalizedError> {
    const normalizedError = this.normalizer.normalizeException(error, context);

    if (context?.workspaceId && context?.provider) {
      await this.recordError(normalizedError);

      await this.eventQueue.publish({
        eventType: 'error.normalized',
        workspaceId: context.workspaceId,
        provider: context.provider,
        accountId: context.accountId,
        module: context.module,
        error: normalizedError,
        timestamp: new Date(),
      });
    }

    return normalizedError;
  }

  async normalizeHttpError(
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
  ): Promise<INormalizedError> {
    const normalizedError = this.normalizer.normalizeHttpError(
      status,
      message,
      data,
      context,
    );

    if (context?.workspaceId && context?.provider) {
      await this.recordError(normalizedError);

      await this.eventQueue.publish({
        eventType: 'error.normalized',
        workspaceId: context.workspaceId,
        provider: context.provider,
        accountId: context.accountId,
        module: context.module,
        error: normalizedError,
        timestamp: new Date(),
      });
    }

    return normalizedError;
  }

  classifyError(error: INormalizedError): IErrorClassification {
    return this.detector.classifyError(error);
  }

  shouldRetry(
    error: INormalizedError,
    attemptCount: number,
    maxAttempts?: number,
  ): boolean {
    return this.detector.shouldRetry(error, attemptCount, maxAttempts);
  }

  calculateBackoff(
    error: INormalizedError,
    attemptCount: number,
    baseDelay?: number,
  ): number {
    return this.detector.calculateBackoff(error, attemptCount, baseDelay);
  }

  shouldSendToDeadLetter(
    error: INormalizedError,
    attemptCount: number,
    maxAttempts?: number,
  ): boolean {
    return this.detector.shouldSendToDeadLetter(
      error,
      attemptCount,
      maxAttempts,
    );
  }

  toSafeResponse(error: INormalizedError): SafeErrorResponse {
    return this.normalizer.toSafeResponse(error);
  }

  toInternalResponse(error: INormalizedError): InternalErrorResponse {
    return this.normalizer.toInternalResponse(error);
  }

  toUserFacingResponse(error: INormalizedError): UserFacingErrorResponse {
    return this.normalizer.toUserFacingResponse(error);
  }

  async searchErrors(criteria: ErrorSearchCriteria): Promise<IErrorHistory[]> {
    const errors = await this.repository.searchErrors(criteria);
    return errors as unknown as IErrorHistory[];
  }

  async countErrors(criteria: ErrorSearchCriteria): Promise<number> {
    return this.repository.countErrors(criteria);
  }

  async getTopErrors(
    workspaceId: string,
    limit?: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<IErrorHistory[]> {
    const errors = await this.repository.findTopErrors(workspaceId, limit, startDate, endDate);
    return errors as unknown as IErrorHistory[];
  }

  async getErrorHistory(
    workspaceId: string,
    historyId: string,
  ): Promise<IErrorHistory | null> {
    const history = await this.repository.findErrorHistoryById(historyId, workspaceId);
    return history as unknown as IErrorHistory | null;
  }

  async getErrorOccurrences(
    workspaceId: string,
    historyId: string,
    limit?: number,
  ): Promise<IErrorOccurrence[]> {
    const occurrences = await this.repository.findErrorOccurrences(workspaceId, historyId, limit);
    return occurrences as unknown as IErrorOccurrence[];
  }

  async resolveError(workspaceId: string, historyId: string): Promise<void> {
    await this.repository.resolveError(workspaceId, historyId);
  }

  async aggregateErrorsByCategory(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
  ) {
    return this.repository.aggregateErrorsByCategory(
      workspaceId,
      startDate,
      endDate,
    );
  }

  async aggregateErrorsBySeverity(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
  ) {
    return this.repository.aggregateErrorsBySeverity(
      workspaceId,
      startDate,
      endDate,
    );
  }

  private async recordError(error: INormalizedError): Promise<void> {
    if (!error.context?.workspaceId || !error.context?.provider) {
      return;
    }

    const existingHistory = (await this.repository.findErrorHistory(
      error.context.workspaceId,
      error.context.provider,
      error.code,
      error.providerError?.providerCode,
    )) as unknown as IErrorHistoryRow | null;

    if (existingHistory) {
      await this.repository.incrementErrorOccurrence(
        existingHistory.id,
        error.context.workspaceId,
      );

      await this.repository.createErrorOccurrence({
        historyId: existingHistory.id,
        workspaceId: error.context.workspaceId,
        errorCode: error.code,
        context: error.context as Record<string, any>,
      });

      if (existingHistory.occurrenceCount >= 9) {
        await this.eventQueue.publish({
          eventType: 'error.threshold_exceeded',
          workspaceId: error.context.workspaceId,
          provider: error.context.provider,
          accountId: error.context.accountId,
          module: error.context.module,
          error,
          metadata: {
            occurrenceCount: existingHistory.occurrenceCount + 1,
            historyId: existingHistory.id,
          },
          timestamp: new Date(),
        });
      }
    } else {
      const history = (await this.repository.createErrorHistory({
        workspaceId: error.context.workspaceId,
        provider: error.context.provider,
        accountId: error.context.accountId,
        module: error.context.module,
        operation: error.context.operation,
        errorCode: error.code,
        errorCategory: error.category,
        errorSeverity: error.severity,
        errorMessage: error.message,
        providerCode: error.providerError?.providerCode,
        providerMessage: error.providerError?.providerMessage,
        httpStatus: error.providerError?.httpStatus,
        requestId: error.providerError?.requestId,
        resourceId: error.context.resourceId,
        metadata: error.providerError?.metadata,
      })) as unknown as IErrorHistoryRow;

      await this.repository.createErrorOccurrence({
        historyId: history.id,
        workspaceId: error.context.workspaceId,
        errorCode: error.code,
        context: error.context as Record<string, any>,
      });

      await this.eventQueue.publish({
        eventType: 'error.recorded',
        workspaceId: error.context.workspaceId,
        provider: error.context.provider,
        accountId: error.context.accountId,
        module: error.context.module,
        error,
        metadata: { historyId: history.id },
        timestamp: new Date(),
      });
    }
  }
}
