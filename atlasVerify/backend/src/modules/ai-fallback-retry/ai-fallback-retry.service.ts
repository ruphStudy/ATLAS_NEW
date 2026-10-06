import { Injectable, Logger } from '@nestjs/common';
import { AiFallbackRetryRepository } from './ai-fallback-retry.repository';
import { AiRetryEventQueue } from './jobs';
import {
  ExecuteWithRetryDto,
  CreateRetryPolicyDto,
  UpdateRetryPolicyDto,
  CreateFallbackConfigDto,
  UpdateFallbackConfigDto,
  RetryExecutionFilterDto,
  RetryPolicyResponseDto,
  RetryExecutionResponseDto,
  PaginatedRetryExecutionResponseDto,
  RetryResultDto,
  FallbackConfigResponseDto,
} from './dto';
import {
  IAiRetryPolicy,
  IAiRetryExecution,
  IAiFallbackConfig,
  AiRetryStatus,
  AiFailureType,
  AiRetryEvent,
  AiBackoffStrategy,
  IRetryResult,
  IRetryError,
  IFallbackCandidate,
} from './interfaces';
import { ResourceNotFoundException } from '@common/exceptions/resource-not-found.exception';
import { BusinessRuleException } from '@common/exceptions/business-rule.exception';
import { DuplicateResourceException } from '@common/exceptions/duplicate-resource.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class AiFallbackRetryService {
  private readonly logger = new Logger(AiFallbackRetryService.name);

  constructor(
    private readonly repository: AiFallbackRetryRepository,
    private readonly eventQueue: AiRetryEventQueue,
  ) {}

  async executeWithRetry(dto: ExecuteWithRetryDto): Promise<IRetryResult> {
    if (dto.idempotencyKey) {
      const existing =
        await this.repository.findRetryExecutionByIdempotencyKey(
          dto.idempotencyKey,
          dto.workspaceId,
        );
      if (existing) {
        this.logger.debug(`Returning existing retry execution for idempotency key`);
        return this.mapToRetryResult(existing);
      }
    }

    const startTime = Date.now();

    const policies = await this.repository.findApplicableRetryPolicies({
      workspaceId: dto.workspaceId,
      capability: dto.capability,
      useCase: dto.useCase,
      modelProvider: dto.provider,
    });

    let policy: IAiRetryPolicy | undefined;
    if (dto.policyId) {
      policy = await this.repository.findRetryPolicyById(dto.policyId);
    } else if (policies.length > 0) {
      policy = policies[0];
    }

    const maxAttempts = policy?.maxRetries ?? 3;

    const execution = await this.repository.createRetryExecution({
      workspaceId: dto.workspaceId,
      status: AiRetryStatus.PENDING,
      orchestratorRequestId: dto.orchestratorRequestId,
      agentExecutionId: dto.agentExecutionId,
      workflowExecutionId: dto.workflowExecutionId,
      capability: dto.capability,
      useCase: dto.useCase,
      originalProvider: dto.provider,
      originalModel: dto.model,
      policyId: policy?.id,
      policySnapshot: policy || null,
      requestPayload: dto.requestPayload,
      requestContext: dto.requestContext || {},
      currentAttempt: 0,
      maxAttempts: maxAttempts + 1,
      idempotencyKey: dto.idempotencyKey,
      startTime: new Date(),
      totalTokensUsed: 0,
      totalCost: 0,
      tags: dto.tags || [],
      metadata: dto.metadata || {},
    });

    await this.eventQueue.publish({
      event: AiRetryEvent.RETRY_STARTED,
      workspaceId: dto.workspaceId,
      retryExecutionId: execution.id,
    });

    await this.repository.updateRetryExecution(execution.id, {
      status: AiRetryStatus.RETRYING,
    });

    let currentProvider = dto.provider;
    let currentModel = dto.model;
    let attemptNumber = 1;
    let lastError: IRetryError | undefined;
    const errors: IRetryError[] = [];

    try {
      while (attemptNumber <= maxAttempts + 1) {
        const attemptStartTime = Date.now();

        await this.eventQueue.publish({
          event: AiRetryEvent.RETRY_ATTEMPT,
          workspaceId: dto.workspaceId,
          retryExecutionId: execution.id,
          attemptNumber,
        });

        try {
          const response = await this.executeRequest(
            currentProvider,
            currentModel,
            dto.requestPayload,
          );

          const attemptDuration = Date.now() - attemptStartTime;
          const tokensUsed = (response as any).tokensUsed || 0;
          const cost = (response as any).cost || 0;

          await this.repository.createRetryAttempt({
            retryExecutionId: execution.id,
            workspaceId: dto.workspaceId,
            attemptNumber,
            provider: currentProvider,
            model: currentModel,
            succeeded: true,
            requestPayload: dto.requestPayload,
            response,
            tokensUsed,
            cost,
            startTime: new Date(attemptStartTime),
            endTime: new Date(),
            duration: attemptDuration,
            metadata: {},
          });

          const totalDuration = Date.now() - startTime;

          await this.repository.updateRetryExecution(execution.id, {
            status: AiRetryStatus.SUCCEEDED,
            currentAttempt: attemptNumber,
            finalProvider: currentProvider,
            finalModel: currentModel,
            finalResponse: response,
            totalTokensUsed: tokensUsed,
            totalCost: cost,
            endTime: new Date(),
            totalDuration,
          });

          await this.eventQueue.publish({
            event: AiRetryEvent.RETRY_SUCCEEDED,
            workspaceId: dto.workspaceId,
            retryExecutionId: execution.id,
            status: AiRetryStatus.SUCCEEDED,
          });

          await this.eventQueue.publish({
            event: AiRetryEvent.RECOVERY_COMPLETED,
            workspaceId: dto.workspaceId,
            retryExecutionId: execution.id,
          });

          return {
            executionId: execution.id,
            status: AiRetryStatus.SUCCEEDED,
            succeeded: true,
            attempts: attemptNumber,
            finalProvider: currentProvider,
            finalModel: currentModel,
            response,
            totalTokensUsed: tokensUsed,
            totalCost: cost,
            totalDuration,
            errors,
          };
        } catch (error) {
          const attemptDuration = Date.now() - attemptStartTime;
          const failureType = this.classifyFailure(error);
          const failureMessage = (error as Error).message;
          const failureCode = (error as any).code;

          lastError = {
            attemptNumber,
            provider: currentProvider,
            model: currentModel,
            failureType,
            failureMessage,
            failureCode,
          };
          errors.push(lastError);

          await this.repository.createRetryAttempt({
            retryExecutionId: execution.id,
            workspaceId: dto.workspaceId,
            attemptNumber,
            provider: currentProvider,
            model: currentModel,
            succeeded: false,
            failureType,
            failureMessage,
            failureCode,
            failureDetails: error,
            requestPayload: dto.requestPayload,
            startTime: new Date(attemptStartTime),
            endTime: new Date(),
            duration: attemptDuration,
            metadata: {},
          });

          await this.repository.updateRetryExecution(execution.id, {
            currentAttempt: attemptNumber,
            lastFailureType: failureType,
            lastFailureMessage: failureMessage,
            lastFailureCode: failureCode,
          });

          await this.eventQueue.publish({
            event: AiRetryEvent.RETRY_FAILED,
            workspaceId: dto.workspaceId,
            retryExecutionId: execution.id,
            attemptNumber,
            metadata: { failureType, failureMessage },
          });

          const isRetryable = this.isRetryableFailure(failureType, policy);

          if (!isRetryable || attemptNumber > maxAttempts) {
            if (policy?.enableFallback && attemptNumber === maxAttempts + 1) {
              const fallback = await this.tryFallback(
                execution.id,
                dto.workspaceId,
                dto.capability,
                dto.useCase,
                currentProvider,
                currentModel,
                failureType,
              );

              if (fallback) {
                currentProvider = fallback.provider;
                currentModel = fallback.model;
                attemptNumber++;
                continue;
              }
            }

            break;
          }

          if (attemptNumber <= maxAttempts) {
            const delay = this.calculateDelay(attemptNumber, policy);
            await this.sleep(delay);
          }

          attemptNumber++;
        }
      }

      const totalDuration = Date.now() - startTime;

      await this.repository.updateRetryExecution(execution.id, {
        status: AiRetryStatus.EXHAUSTED,
        endTime: new Date(),
        totalDuration,
      });

      await this.eventQueue.publish({
        event: AiRetryEvent.RETRY_EXHAUSTED,
        workspaceId: dto.workspaceId,
        retryExecutionId: execution.id,
        status: AiRetryStatus.EXHAUSTED,
      });

      return {
        executionId: execution.id,
        status: AiRetryStatus.EXHAUSTED,
        succeeded: false,
        attempts: attemptNumber - 1,
        totalTokensUsed: 0,
        totalCost: 0,
        totalDuration,
        errors,
      };
    } catch (error) {
      await this.repository.updateRetryExecution(execution.id, {
        status: AiRetryStatus.FAILED,
        endTime: new Date(),
        totalDuration: Date.now() - startTime,
      });

      throw error;
    }
  }

  async findRetryExecutionById(
    id: string,
    workspaceId: string,
  ): Promise<IAiRetryExecution> {
    const execution = await this.repository.findRetryExecutionById(
      id,
      workspaceId,
    );
    if (!execution) {
      throw new ResourceNotFoundException(
        'Retry execution not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return execution;
  }

  async findAllRetryExecutions(
    filter: RetryExecutionFilterDto,
  ): Promise<PaginatedRetryExecutionResponseDto> {
    const [data, total] = await this.repository.findAllRetryExecutions(filter);

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data as RetryExecutionResponseDto[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getAttempts(id: string, workspaceId: string): Promise<any[]> {
    await this.findRetryExecutionById(id, workspaceId);
    return this.repository.findAttemptsByRetryExecutionId(id);
  }

  async getFallbacks(id: string, workspaceId: string): Promise<any[]> {
    await this.findRetryExecutionById(id, workspaceId);
    return this.repository.findFallbacksByRetryExecutionId(id);
  }

  async createRetryPolicy(
    dto: CreateRetryPolicyDto,
  ): Promise<IAiRetryPolicy> {
    const existing = await this.repository.findRetryPolicyByName(
      dto.name,
      dto.workspaceId,
    );

    if (existing) {
      throw new DuplicateResourceException(
        'Retry policy with this name already exists',
        ErrorCode.DUPLICATE_RESOURCE,
      );
    }

    const data = {
      workspaceId: dto.workspaceId,
      name: dto.name,
      capability: dto.capability,
      useCase: dto.useCase,
      modelProvider: dto.modelProvider,
      maxRetries: dto.maxRetries ?? 3,
      initialDelayMs: dto.initialDelayMs ?? 1000,
      maxDelayMs: dto.maxDelayMs ?? 60000,
      backoffMultiplier: dto.backoffMultiplier ?? 2.0,
      backoffStrategy: dto.backoffStrategy ?? AiBackoffStrategy.EXPONENTIAL,
      jitterFactor: dto.jitterFactor ?? 0.1,
      timeoutMs: dto.timeoutMs,
      retryableFailures: dto.retryableFailures || [],
      nonRetryableFailures: dto.nonRetryableFailures || [],
      enableFallback: dto.enableFallback ?? true,
      fallbackPriority: dto.fallbackPriority ?? 0,
      respectBudget: dto.respectBudget ?? true,
      respectQuota: dto.respectQuota ?? true,
      respectCircuitBreaker: dto.respectCircuitBreaker ?? true,
      enabled: dto.enabled ?? true,
      priority: dto.priority ?? 0,
      tags: dto.tags || [],
      metadata: dto.metadata || {},
    };

    return (await this.repository.createRetryPolicy(data)) as IAiRetryPolicy;
  }

  async updateRetryPolicy(
    id: string,
    dto: UpdateRetryPolicyDto,
  ): Promise<IAiRetryPolicy> {
    await this.findRetryPolicyById(id);
    return (await this.repository.updateRetryPolicy(id, dto)) as IAiRetryPolicy;
  }

  async deleteRetryPolicy(id: string): Promise<void> {
    await this.findRetryPolicyById(id);
    await this.repository.deleteRetryPolicy(id);
  }

  async findRetryPolicyById(id: string): Promise<IAiRetryPolicy> {
    const policy = await this.repository.findRetryPolicyById(id);
    if (!policy) {
      throw new ResourceNotFoundException(
        'Retry policy not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return policy;
  }

  async createFallbackConfig(
    dto: CreateFallbackConfigDto,
  ): Promise<IAiFallbackConfig> {
    const existing = await this.repository.findFallbackConfigByName(
      dto.name,
      dto.workspaceId,
    );

    if (existing) {
      throw new DuplicateResourceException(
        'Fallback config with this name already exists',
        ErrorCode.DUPLICATE_RESOURCE,
      );
    }

    const data = {
      workspaceId: dto.workspaceId,
      name: dto.name,
      capability: dto.capability,
      useCase: dto.useCase,
      sourceProvider: dto.sourceProvider,
      sourceModel: dto.sourceModel,
      fallbackProvider: dto.fallbackProvider,
      fallbackModel: dto.fallbackModel,
      priority: dto.priority ?? 0,
      enabled: dto.enabled ?? true,
      triggerFailureTypes: dto.triggerFailureTypes || [],
      costThreshold: dto.costThreshold,
      latencyThreshold: dto.latencyThreshold,
      requireHealthCheck: dto.requireHealthCheck ?? true,
      requireBudget: dto.requireBudget ?? true,
      region: dto.region,
      tags: dto.tags || [],
      metadata: dto.metadata || {},
    };

    return (await this.repository.createFallbackConfig(
      data,
    )) as IAiFallbackConfig;
  }

  async updateFallbackConfig(
    id: string,
    dto: UpdateFallbackConfigDto,
  ): Promise<IAiFallbackConfig> {
    await this.findFallbackConfigById(id);
    return (await this.repository.updateFallbackConfig(
      id,
      dto,
    )) as IAiFallbackConfig;
  }

  async deleteFallbackConfig(id: string): Promise<void> {
    await this.findFallbackConfigById(id);
    await this.repository.deleteFallbackConfig(id);
  }

  async findFallbackConfigById(id: string): Promise<IAiFallbackConfig> {
    const config = await this.repository.findFallbackConfigById(id);
    if (!config) {
      throw new ResourceNotFoundException(
        'Fallback config not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return config;
  }

  async getRetryStats(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    return this.repository.getRetryStats(workspaceId, startDate, endDate);
  }

  private async executeRequest(
    provider: string,
    model: string,
    payload: unknown,
  ): Promise<unknown> {
    await this.sleep(100);
    
    if (Math.random() < 0.7) {
      return {
        result: 'success',
        tokensUsed: 100,
        cost: 0.001,
      };
    }

    throw new Error('Request failed');
  }

  private classifyFailure(error: any): AiFailureType {
    const message = error.message?.toLowerCase() || '';

    if (message.includes('timeout')) return AiFailureType.TIMEOUT;
    if (message.includes('rate limit')) return AiFailureType.RATE_LIMIT;
    if (message.includes('unauthorized')) return AiFailureType.UNAUTHORIZED;
    if (message.includes('budget')) return AiFailureType.BUDGET_EXCEEDED;
    if (message.includes('quota')) return AiFailureType.QUOTA_EXCEEDED;
    if (message.includes('validation')) return AiFailureType.VALIDATION_ERROR;
    if (message.includes('safety')) return AiFailureType.SAFETY_ERROR;
    if (message.includes('network')) return AiFailureType.NETWORK_ERROR;

    return AiFailureType.UNKNOWN;
  }

  private isRetryableFailure(
    failureType: AiFailureType,
    policy?: IAiRetryPolicy,
  ): boolean {
    if (policy?.nonRetryableFailures.includes(failureType)) {
      return false;
    }

    if (policy?.retryableFailures.length > 0) {
      return policy.retryableFailures.includes(failureType);
    }

    const nonRetryableTypes = [
      AiFailureType.UNAUTHORIZED,
      AiFailureType.VALIDATION_ERROR,
      AiFailureType.SAFETY_ERROR,
      AiFailureType.BUDGET_EXCEEDED,
    ];

    return !nonRetryableTypes.includes(failureType);
  }

  private calculateDelay(attemptNumber: number, policy?: IAiRetryPolicy): number {
    const initialDelay = policy?.initialDelayMs ?? 1000;
    const maxDelay = policy?.maxDelayMs ?? 60000;
    const multiplier = policy?.backoffMultiplier ?? 2.0;
    const jitterFactor = policy?.jitterFactor ?? 0.1;
    const strategy = policy?.backoffStrategy ?? AiBackoffStrategy.EXPONENTIAL;

    let delay = initialDelay;

    switch (strategy) {
      case AiBackoffStrategy.FIXED:
        delay = initialDelay;
        break;
      case AiBackoffStrategy.LINEAR:
        delay = initialDelay * attemptNumber;
        break;
      case AiBackoffStrategy.EXPONENTIAL:
        delay = initialDelay * Math.pow(multiplier, attemptNumber - 1);
        break;
      case AiBackoffStrategy.EXPONENTIAL_JITTER:
        delay = initialDelay * Math.pow(multiplier, attemptNumber - 1);
        const jitter = delay * jitterFactor * (Math.random() * 2 - 1);
        delay += jitter;
        break;
    }

    return Math.min(delay, maxDelay);
  }

  private async tryFallback(
    retryExecutionId: string,
    workspaceId: string,
    capability: string,
    useCase: string | undefined,
    sourceProvider: string,
    sourceModel: string,
    failureType: AiFailureType,
  ): Promise<IFallbackCandidate | null> {
    const configs = await this.repository.findApplicableFallbackConfigs({
      workspaceId,
      capability,
      useCase,
      sourceProvider,
      failureType: failureType.toString(),
    });

    if (configs.length === 0) {
      return null;
    }

    const fallbackConfig = configs[0];

    await this.eventQueue.publish({
      event: AiRetryEvent.FALLBACK_TRIGGERED,
      workspaceId,
      retryExecutionId,
      metadata: {
        fallbackProvider: fallbackConfig.fallbackProvider,
        fallbackModel: fallbackConfig.fallbackModel,
      },
    });

    await this.repository.createFallbackExecution({
      retryExecutionId,
      workspaceId,
      configId: fallbackConfig.id,
      sourceProvider,
      sourceModel,
      fallbackProvider: fallbackConfig.fallbackProvider,
      fallbackModel: fallbackConfig.fallbackModel,
      reason: `Fallback due to ${failureType}`,
      triggerFailureType: failureType,
      succeeded: false,
      startTime: new Date(),
      metadata: {},
    });

    return {
      provider: fallbackConfig.fallbackProvider,
      model: fallbackConfig.fallbackModel,
      priority: fallbackConfig.priority,
      costThreshold: fallbackConfig.costThreshold || undefined,
      latencyThreshold: fallbackConfig.latencyThreshold || undefined,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private mapToRetryResult(execution: IAiRetryExecution): IRetryResult {
    return {
      executionId: execution.id,
      status: execution.status,
      succeeded: execution.status === AiRetryStatus.SUCCEEDED,
      attempts: execution.currentAttempt,
      finalProvider: execution.finalProvider || undefined,
      finalModel: execution.finalModel || undefined,
      response: execution.finalResponse || undefined,
      totalTokensUsed: execution.totalTokensUsed,
      totalCost: execution.totalCost,
      totalDuration: execution.totalDuration || undefined,
      errors: [],
    };
  }
}
