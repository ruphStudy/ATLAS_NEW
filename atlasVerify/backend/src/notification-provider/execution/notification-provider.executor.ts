import { Injectable, Logger } from '@nestjs/common';
import { AtlasException } from '@common/exceptions';
import { NotificationProviderRateLimiter } from './notification-provider-rate-limiter';
import { NotificationProviderEventEmitter } from '../events/notification-provider-event.emitter';
import { NOTIFICATION_PROVIDER_DEFAULTS } from '../constants';
import {
  NotificationProviderEventType,
  INotificationExecutionCriteria,
  INotificationExecutionResolution,
  NotificationProviderResolveFn,
} from '../interfaces';
import {
  NotificationProviderRateLimitedException,
  NotificationProviderTimeoutException,
  NotificationProviderUnavailableException,
  NotificationProviderRequestFailedException,
  NotificationProviderAllFallbacksExhaustedException,
} from '../exceptions/notification-provider.exceptions';

/**
 * Generic retry/backoff/timeout/rate-limit/fallback wrapper around a
 * caller-supplied `resolve` + `invoke` pair, mirroring
 * src/ai/execution/ai-provider.executor.ts's algorithm exactly. Unlike the
 * AI executor (which is bound to a constructor-injected foundation
 * factory), this one takes `resolve` as a parameter — the persisted
 * notification-provider module owns the "which provider/config/credential"
 * resolution (DB-backed), while this class owns only the generic
 * execution mechanics.
 */
@Injectable()
export class NotificationProviderExecutor {
  private readonly logger = new Logger(NotificationProviderExecutor.name);

  constructor(
    private readonly rateLimiter: NotificationProviderRateLimiter,
    private readonly eventEmitter: NotificationProviderEventEmitter,
  ) {}

  async execute<TResult>(
    criteria: INotificationExecutionCriteria,
    resolve: NotificationProviderResolveFn,
    invoke: (resolution: INotificationExecutionResolution) => Promise<TResult>,
  ): Promise<TResult> {
    const attempted: string[] = [];
    let currentCriteria = criteria;

    for (let hop = 0; hop < NOTIFICATION_PROVIDER_DEFAULTS.MAX_FALLBACK_HOPS; hop++) {
      const resolution = await resolve(currentCriteria);
      const { providerKey, config } = resolution;
      attempted.push(providerKey);

      const maxPerMinute =
        config.rateLimitPolicy?.maxRequestsPerMinute ??
        NOTIFICATION_PROVIDER_DEFAULTS.MAX_REQUESTS_PER_MINUTE;

      if (!this.rateLimiter.tryConsume(providerKey, criteria.workspaceId, maxPerMinute)) {
        this.eventEmitter.emit({
          type: NotificationProviderEventType.PROVIDER_RATE_LIMITED,
          providerKey,
          workspaceId: criteria.workspaceId,
          occurredAt: new Date(),
        });

        const fallback = this.nextFallbackCandidate(config, attempted);
        if (fallback) {
          currentCriteria = { ...criteria, preferredProviderKey: fallback };
          continue;
        }

        throw new NotificationProviderRateLimitedException(providerKey);
      }

      this.eventEmitter.emit({
        type: NotificationProviderEventType.PROVIDER_REQUEST_STARTED,
        providerKey,
        workspaceId: criteria.workspaceId,
        occurredAt: new Date(),
      });

      try {
        const result = await this.runWithRetry(resolution, invoke);

        this.eventEmitter.emit({
          type: NotificationProviderEventType.PROVIDER_REQUEST_COMPLETED,
          providerKey,
          workspaceId: criteria.workspaceId,
          occurredAt: new Date(),
        });

        return result;
      } catch (error) {
        const normalized = this.normalizeError(providerKey, error as Error);

        const fallback = this.nextFallbackCandidate(config, attempted, normalized);
        if (fallback) {
          this.eventEmitter.emit({
            type: NotificationProviderEventType.PROVIDER_FALLBACK_TRIGGERED,
            providerKey,
            workspaceId: criteria.workspaceId,
            occurredAt: new Date(),
            payload: { nextProviderKey: fallback },
          });
          currentCriteria = { ...criteria, preferredProviderKey: fallback };
          continue;
        }

        this.eventEmitter.emit({
          type: NotificationProviderEventType.PROVIDER_REQUEST_FAILED,
          providerKey,
          workspaceId: criteria.workspaceId,
          occurredAt: new Date(),
          payload: { errorCode: normalized.errorCode },
        });

        throw normalized;
      }
    }

    throw new NotificationProviderAllFallbacksExhaustedException(attempted);
  }

  private async runWithRetry<TResult>(
    resolution: INotificationExecutionResolution,
    invoke: (resolution: INotificationExecutionResolution) => Promise<TResult>,
  ): Promise<TResult> {
    const retryPolicy = resolution.config.retryPolicy ?? {
      maxAttempts: NOTIFICATION_PROVIDER_DEFAULTS.MAX_RETRY_ATTEMPTS,
      backoffMs: NOTIFICATION_PROVIDER_DEFAULTS.RETRY_BACKOFF_MS,
      backoffMultiplier: NOTIFICATION_PROVIDER_DEFAULTS.RETRY_BACKOFF_MULTIPLIER,
    };
    const timeoutMs =
      resolution.config.timeoutPolicy?.requestTimeoutMs ??
      NOTIFICATION_PROVIDER_DEFAULTS.REQUEST_TIMEOUT_MS;

    for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt++) {
      try {
        return await this.withTimeout(invoke(resolution), timeoutMs, resolution.providerKey);
      } catch (error) {
        if (attempt >= retryPolicy.maxAttempts || !this.isRetryable(error as Error, retryPolicy)) {
          throw error;
        }

        this.eventEmitter.emit({
          type: NotificationProviderEventType.PROVIDER_REQUEST_RETRIED,
          providerKey: resolution.providerKey,
          workspaceId: resolution.config.workspaceId,
          occurredAt: new Date(),
          payload: { attempt },
        });

        const backoffMs =
          retryPolicy.backoffMs * Math.pow(retryPolicy.backoffMultiplier ?? 1, attempt - 1);
        await this.delay(backoffMs);
      }
    }

    // Unreachable — the loop above always returns or throws.
    throw new NotificationProviderUnavailableException(resolution.providerKey);
  }

  private withTimeout<TResult>(
    promise: Promise<TResult>,
    timeoutMs: number,
    providerKey: string,
  ): Promise<TResult> {
    return new Promise<TResult>((resolvePromise, rejectPromise) => {
      const timer = setTimeout(() => {
        rejectPromise(new NotificationProviderTimeoutException(providerKey, timeoutMs));
      }, timeoutMs);

      promise
        .then((result) => {
          clearTimeout(timer);
          resolvePromise(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          rejectPromise(error);
        });
    });
  }

  private isRetryable(
    error: Error,
    retryPolicy: { retryableErrorCodes?: string[] },
  ): boolean {
    if (retryPolicy.retryableErrorCodes && retryPolicy.retryableErrorCodes.length > 0) {
      return (
        error instanceof AtlasException &&
        retryPolicy.retryableErrorCodes.includes(error.errorCode)
      );
    }

    return (
      error instanceof NotificationProviderTimeoutException ||
      error instanceof NotificationProviderRateLimitedException ||
      error instanceof NotificationProviderUnavailableException
    );
  }

  private nextFallbackCandidate(
    config: INotificationExecutionResolution['config'],
    attempted: string[],
    error?: AtlasException,
  ): string | undefined {
    const chain = config.fallbackPolicy?.fallbackProviderKeys ?? [];

    if (
      error &&
      config.fallbackPolicy?.fallbackOnErrorCodes &&
      config.fallbackPolicy.fallbackOnErrorCodes.length > 0 &&
      !config.fallbackPolicy.fallbackOnErrorCodes.includes(error.errorCode)
    ) {
      return undefined;
    }

    return chain.find((key) => !attempted.includes(key));
  }

  private normalizeError(providerKey: string, error: Error): AtlasException {
    if (error instanceof AtlasException) {
      return error;
    }
    return new NotificationProviderRequestFailedException(providerKey, error.message);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
