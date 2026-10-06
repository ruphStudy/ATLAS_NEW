import { Injectable } from '@nestjs/common';
import { AtlasException } from '../../common/exceptions/atlas.exception';
import {
  AiProviderEventType,
  IAiProviderConfig,
  IAiProviderResolution,
  IAiProviderResolutionCriteria,
  IAiResponse,
  IAiRetryPolicy,
  IAiTokenUsage,
} from '../interfaces';
import {
  AiProviderAllFallbacksExhaustedException,
  AiProviderRateLimitedException,
  AiProviderRequestFailedException,
  AiProviderTimeoutException,
  AiProviderUnavailableException,
} from '../exceptions/ai-provider.exceptions';
import { AiProviderFactory } from '../factory/ai-provider.factory';
import { AiProviderEventEmitter } from '../events/ai-provider-event.emitter';
import { AiProviderMetricsService } from '../metrics/ai-provider.metrics';
import { AiProviderRateLimiter } from './ai-provider-rate-limiter';
import { AI_PROVIDER_DEFAULTS } from '../constants';

const EMPTY_USAGE: IAiTokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

/**
 * AiProviderExecutor
 *
 * Cross-cutting invocation wrapper applied on top of `AiProviderFactory`
 * resolution: timeout, retry-with-backoff, request-level fallback,
 * rate-limiting and error normalization — all driven by the resolved
 * provider's configured policies (falling back to `AI_PROVIDER_DEFAULTS`),
 * never by provider-specific logic.
 *
 * `AiProviderFactory.resolve` already falls through
 * `fallbackPolicy.fallbackProviderKeys` for *static* unsuitability
 * (disabled / unconfigured / capability unsupported). This executor
 * additionally falls through the same chain for *runtime* failures
 * (timeouts, thrown errors, rate limiting) encountered while actually
 * invoking the provider.
 */
@Injectable()
export class AiProviderExecutor {
  constructor(
    private readonly factory: AiProviderFactory,
    private readonly eventEmitter: AiProviderEventEmitter,
    private readonly metrics: AiProviderMetricsService,
    private readonly rateLimiter: AiProviderRateLimiter,
  ) {}

  async execute<TResult>(
    criteria: IAiProviderResolutionCriteria,
    invoke: (resolution: IAiProviderResolution) => Promise<IAiResponse<TResult>>,
  ): Promise<IAiResponse<TResult>> {
    const attempted: string[] = [];
    let currentCriteria = criteria;

    for (let hop = 0; hop <= AI_PROVIDER_DEFAULTS.MAX_FALLBACK_HOPS; hop++) {
      const resolution = await this.factory.resolve(currentCriteria);
      const { config } = resolution;
      attempted.push(config.providerKey);

      const maxPerMinute =
        config.rateLimitPolicy?.maxRequestsPerMinute ?? AI_PROVIDER_DEFAULTS.MAX_REQUESTS_PER_MINUTE;

      if (!this.rateLimiter.tryConsume(config.providerKey, criteria.workspaceId, maxPerMinute)) {
        this.eventEmitter.emit({
          type: AiProviderEventType.PROVIDER_RATE_LIMITED,
          providerKey: config.providerKey,
          workspaceId: criteria.workspaceId,
          occurredAt: new Date(),
        });

        const nextCandidate = this.nextFallbackCandidate(config, attempted);
        if (nextCandidate) {
          currentCriteria = { ...criteria, preferredProviderKey: nextCandidate };
          continue;
        }
        throw new AiProviderRateLimitedException(config.providerKey);
      }

      const startedAt = Date.now();
      this.eventEmitter.emit({
        type: AiProviderEventType.PROVIDER_REQUEST_STARTED,
        providerKey: config.providerKey,
        workspaceId: criteria.workspaceId,
        occurredAt: new Date(),
      });

      try {
        const response = await this.runWithRetry(resolution, invoke, criteria.workspaceId);
        this.metrics.recordRequest(
          config.providerKey,
          criteria.workspaceId,
          response.usage,
          response.cost,
          Date.now() - startedAt,
          true,
        );
        this.eventEmitter.emit({
          type: AiProviderEventType.PROVIDER_REQUEST_COMPLETED,
          providerKey: config.providerKey,
          workspaceId: criteria.workspaceId,
          occurredAt: new Date(),
          payload: { latencyMs: Date.now() - startedAt },
        });
        return response;
      } catch (error) {
        const normalized = this.normalizeError(config.providerKey, error);
        this.metrics.recordRequest(
          config.providerKey,
          criteria.workspaceId,
          EMPTY_USAGE,
          undefined,
          Date.now() - startedAt,
          false,
        );

        const nextCandidate = this.nextFallbackCandidate(config, attempted, normalized);
        if (nextCandidate) {
          this.eventEmitter.emit({
            type: AiProviderEventType.PROVIDER_FALLBACK_TRIGGERED,
            providerKey: config.providerKey,
            workspaceId: criteria.workspaceId,
            occurredAt: new Date(),
            payload: { reason: normalized.message, nextCandidate },
          });
          currentCriteria = { ...criteria, preferredProviderKey: nextCandidate };
          continue;
        }

        this.eventEmitter.emit({
          type: AiProviderEventType.PROVIDER_REQUEST_FAILED,
          providerKey: config.providerKey,
          workspaceId: criteria.workspaceId,
          occurredAt: new Date(),
          payload: { message: normalized.message },
        });
        throw normalized;
      }
    }

    throw new AiProviderAllFallbacksExhaustedException(attempted);
  }

  private async runWithRetry<TResult>(
    resolution: IAiProviderResolution,
    invoke: (resolution: IAiProviderResolution) => Promise<IAiResponse<TResult>>,
    workspaceId: string,
  ): Promise<IAiResponse<TResult>> {
    const retryPolicy: IAiRetryPolicy = resolution.config.retryPolicy ?? {
      maxAttempts: AI_PROVIDER_DEFAULTS.MAX_RETRY_ATTEMPTS,
      backoffMs: AI_PROVIDER_DEFAULTS.RETRY_BACKOFF_MS,
      backoffMultiplier: AI_PROVIDER_DEFAULTS.RETRY_BACKOFF_MULTIPLIER,
    };
    const timeoutMs =
      resolution.config.timeoutPolicy?.requestTimeoutMs ?? AI_PROVIDER_DEFAULTS.REQUEST_TIMEOUT_MS;

    let lastError: unknown;

    for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt++) {
      try {
        return await this.withTimeout(invoke(resolution), timeoutMs, resolution.config.providerKey);
      } catch (error) {
        lastError = error;
        const retryable = this.isRetryable(error, retryPolicy);
        if (attempt >= retryPolicy.maxAttempts || !retryable) {
          throw error;
        }

        this.eventEmitter.emit({
          type: AiProviderEventType.PROVIDER_REQUEST_RETRIED,
          providerKey: resolution.config.providerKey,
          workspaceId,
          occurredAt: new Date(),
          payload: { attempt },
        });

        const backoffMs =
          retryPolicy.backoffMs * Math.pow(retryPolicy.backoffMultiplier ?? 1, attempt - 1);
        await this.delay(backoffMs);
      }
    }

    throw lastError;
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number, providerKey: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new AiProviderTimeoutException(providerKey, timeoutMs));
      }, timeoutMs);

      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        },
      );
    });
  }

  private isRetryable(error: unknown, retryPolicy: IAiRetryPolicy): boolean {
    if (retryPolicy.retryableErrorCodes && retryPolicy.retryableErrorCodes.length > 0) {
      const code = error instanceof AtlasException ? error.errorCode : undefined;
      return code ? retryPolicy.retryableErrorCodes.includes(code) : false;
    }
    return (
      error instanceof AiProviderTimeoutException ||
      error instanceof AiProviderRateLimitedException ||
      error instanceof AiProviderUnavailableException
    );
  }

  private nextFallbackCandidate(
    config: IAiProviderConfig,
    attempted: string[],
    error?: AtlasException,
  ): string | undefined {
    const chain = config.fallbackPolicy?.fallbackProviderKeys ?? [];
    const restrictedCodes = config.fallbackPolicy?.fallbackOnErrorCodes;

    if (error && restrictedCodes && restrictedCodes.length > 0 && !restrictedCodes.includes(error.errorCode)) {
      return undefined;
    }

    return chain.find((key) => !attempted.includes(key));
  }

  private normalizeError(providerKey: string, error: unknown): AtlasException {
    if (error instanceof AtlasException) {
      return error;
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new AiProviderRequestFailedException(providerKey, message);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
