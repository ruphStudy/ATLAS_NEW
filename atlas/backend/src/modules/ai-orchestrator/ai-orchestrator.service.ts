import { Injectable, Logger } from '@nestjs/common';
import { AiOrchestratorRepository } from './ai-orchestrator.repository';
import { AiOrchestratorEventQueue } from './jobs';
import { AiModelManagementService } from '@modules/ai-model-management/ai-model-management.service';
import { AiGuardrailsService } from '@modules/ai-guardrails/ai-guardrails.service';
import {
  GuardrailStage,
  GuardrailDecision,
} from '@modules/ai-guardrails/interfaces';
import { AiGuardrailActionBlockedException } from '@modules/ai-guardrails/exceptions/ai-guardrail.exceptions';
import { AiCostTrackingService } from '@modules/ai-cost-tracking/ai-cost-tracking.service';
import { AiCostRecordStatus } from '@modules/ai-cost-tracking/interfaces';
import { AiUsageTrackingService } from '@modules/ai-usage-tracking/ai-usage-tracking.service';
import {
  AiUsageRecordStatus,
  AiUsageSource,
} from '@modules/ai-usage-tracking/interfaces';
import {
  CreateAiRequestDto,
  ExecuteAiRequestDto,
  AiRequestFilterDto,
  ExecutionLogFilterDto,
  AiRequestResponseDto,
  PaginatedAiRequestResponseDto,
  ExecutionResultDto,
  NormalizedResponseDto,
  PaginatedExecutionLogResponseDto,
  ExecutionLogResponseDto,
} from './dto';
import {
  IAiRequest,
  IAiResponse,
  IAiExecutionLog,
  IExecutionResult,
  INormalizedResponse,
  AiRequestStatus,
  AiExecutionMode,
  AiRoutingStrategy,
  AiOrchestratorEvent,
  IRoutingCriteria,
} from './interfaces';
import { ResourceNotFoundException } from '@common/exceptions/resource-not-found.exception';
import { BusinessRuleException } from '@common/exceptions/business-rule.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class AiOrchestratorService {
  private readonly logger = new Logger(AiOrchestratorService.name);
  private readonly CACHE_TTL_MINUTES = 30;

  constructor(
    private readonly repository: AiOrchestratorRepository,
    private readonly eventQueue: AiOrchestratorEventQueue,
    private readonly modelManagementService: AiModelManagementService,
    private readonly guardrailsService: AiGuardrailsService,
    private readonly costTrackingService: AiCostTrackingService,
    private readonly usageTrackingService: AiUsageTrackingService,
  ) {}

  async createRequest(dto: CreateAiRequestDto): Promise<IAiRequest> {
    const data = {
      workspaceId: dto.workspaceId,
      useCase: dto.useCase,
      capability: dto.capability,
      provider: dto.provider,
      modelId: dto.modelId,
      prompt: dto.prompt,
      context: dto.context || null,
      parameters: dto.parameters || {},
      status: AiRequestStatus.PENDING,
      executionMode: dto.executionMode ?? AiExecutionMode.SYNC,
      priority: dto.priority ?? 0,
      routingStrategy: dto.routingStrategy ?? AiRoutingStrategy.BALANCED,
      routingCriteria: dto.routingCriteria || null,
      maxRetries: dto.maxRetries ?? 3,
      timeout: dto.timeout,
      userId: dto.userId,
      requestMetadata: dto.requestMetadata || null,
    };

    const request = (await this.repository.createRequest(data)) as IAiRequest;

    await this.eventQueue.publish({
      event: AiOrchestratorEvent.REQUEST_RECEIVED,
      workspaceId: request.workspaceId,
      requestId: request.id,
      capability: request.capability,
      useCase: request.useCase,
    });

    return request;
  }

  async executeRequest(dto: ExecuteAiRequestDto): Promise<IExecutionResult> {
    const cacheKey = this.buildCacheKey(dto);
    
    const cached = await this.repository.getCachedResult(
      dto.workspaceId,
      cacheKey,
    );

    if (cached) {
      await this.eventQueue.publish({
        event: AiOrchestratorEvent.CACHE_HIT,
        workspaceId: dto.workspaceId,
        requestId: cached.requestId as string,
      });

      return cached as unknown as IExecutionResult;
    }

    await this.eventQueue.publish({
      event: AiOrchestratorEvent.CACHE_MISS,
      workspaceId: dto.workspaceId,
      requestId: 'pending',
    });

    const request = await this.createRequest(dto as CreateAiRequestDto);

    const result = await this.processExecution(request);

    await this.repository.setCachedResult(
      dto.workspaceId,
      cacheKey,
      result as unknown as Record<string, unknown>,
      this.CACHE_TTL_MINUTES,
    );

    return result;
  }

  async processExecution(request: IAiRequest): Promise<IExecutionResult> {
    await this.repository.updateRequest(request.id, {
      status: AiRequestStatus.PROCESSING,
    });

    let attemptNumber = 0;
    let lastError: Error | null = null;

    while (attemptNumber < request.maxRetries) {
      attemptNumber++;

      try {
        const result = await this.executeWithProvider(request, attemptNumber);
        
        await this.repository.updateRequest(request.id, {
          status: AiRequestStatus.COMPLETED,
        });

        await this.eventQueue.publish({
          event: AiOrchestratorEvent.EXECUTION_COMPLETED,
          workspaceId: request.workspaceId,
          requestId: request.id,
          provider: result.provider,
          modelKey: result.modelKey,
          latency: result.latency,
          cost: result.cost,
        });

        return result;
      } catch (error) {
        lastError = error as Error;

        this.logger.warn(
          `Execution attempt ${attemptNumber} failed for request ${request.id}: ${error.message}`,
        );

        if (error instanceof AiGuardrailActionBlockedException) {
          break;
        }

        await this.eventQueue.publish({
          event: AiOrchestratorEvent.RETRY_ATTEMPTED,
          workspaceId: request.workspaceId,
          requestId: request.id,
          attemptNumber,
          errorCode: (error as any).code || 'UNKNOWN',
        });

        if (attemptNumber >= request.maxRetries) {
          break;
        }

        await this.delay(Math.pow(2, attemptNumber) * 1000);
      }
    }

    await this.repository.updateRequest(request.id, {
      status: AiRequestStatus.FAILED,
    });

    await this.eventQueue.publish({
      event: AiOrchestratorEvent.EXECUTION_FAILED,
      workspaceId: request.workspaceId,
      requestId: request.id,
      errorCode: (lastError as any)?.code || 'MAX_RETRIES_EXCEEDED',
    });

    if (lastError instanceof AiGuardrailActionBlockedException) {
      throw lastError;
    }

    throw new BusinessRuleException(
      lastError?.message || 'Execution failed after max retries',
      ErrorCode.BUSINESS_RULE_VIOLATION,
    );
  }

  async executeWithProvider(
    request: IAiRequest,
    attemptNumber: number,
  ): Promise<IExecutionResult> {
    const startTime = new Date();

    const resolvedModel = await this.modelManagementService.resolveModel({
      workspaceId: request.workspaceId,
      capability: request.capability,
      useCase: request.useCase,
    });

    const inputGuardrailOutcome = await this.guardrailsService.evaluate({
      workspaceId: request.workspaceId,
      stage: GuardrailStage.INPUT,
      content: request.prompt,
      capability: request.capability,
      useCase: request.useCase,
      modelProvider: resolvedModel.model.provider,
      orchestratorRequestId: request.id,
      userId: request.userId ?? undefined,
    });

    if (inputGuardrailOutcome.decision === GuardrailDecision.BLOCK) {
      throw new AiGuardrailActionBlockedException(
        inputGuardrailOutcome.reasons.join('; ') || 'input guardrail violation',
      );
    }

    const effectivePrompt =
      inputGuardrailOutcome.decision === GuardrailDecision.REDACT &&
      inputGuardrailOutcome.redactedContent
        ? inputGuardrailOutcome.redactedContent
        : request.prompt;

    const executionLog = await this.repository.createExecutionLog({
      requestId: request.id,
      workspaceId: request.workspaceId,
      provider: resolvedModel.model.provider,
      modelKey: resolvedModel.model.modelKey,
      capability: request.capability,
      useCase: request.useCase,
      status: 'processing',
      startTime,
      attemptNumber,
      fallbackUsed: false,
      metadata: {},
    });

    await this.eventQueue.publish({
      event: AiOrchestratorEvent.EXECUTION_STARTED,
      workspaceId: request.workspaceId,
      requestId: request.id,
      provider: resolvedModel.model.provider,
      modelKey: resolvedModel.model.modelKey,
    });

    try {
      const mockResult = {
        content: `Mock AI response for: ${effectivePrompt}`,
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      };

      const outputGuardrailOutcome = await this.guardrailsService.evaluate({
        workspaceId: request.workspaceId,
        stage: GuardrailStage.OUTPUT,
        content: mockResult.content,
        capability: request.capability,
        useCase: request.useCase,
        modelProvider: resolvedModel.model.provider,
        orchestratorRequestId: request.id,
        userId: request.userId ?? undefined,
      });

      if (outputGuardrailOutcome.decision === GuardrailDecision.BLOCK) {
        throw new AiGuardrailActionBlockedException(
          outputGuardrailOutcome.reasons.join('; ') || 'output guardrail violation',
        );
      }

      if (
        outputGuardrailOutcome.decision === GuardrailDecision.REDACT &&
        outputGuardrailOutcome.redactedContent
      ) {
        mockResult.content = outputGuardrailOutcome.redactedContent;
      }

      const endTime = new Date();
      const latency = endTime.getTime() - startTime.getTime();
      const cost = this.calculateCost(
        mockResult.inputTokens,
        mockResult.outputTokens,
        resolvedModel.model.pricingInputPer1k || 0,
        resolvedModel.model.pricingOutputPer1k || 0,
      );

      await this.repository.updateExecutionLog(executionLog.id, {
        status: 'completed',
        endTime,
        latency,
        inputTokens: mockResult.inputTokens,
        outputTokens: mockResult.outputTokens,
        totalTokens: mockResult.totalTokens,
        cost,
      });

      const response = await this.repository.createResponse({
        requestId: request.id,
        provider: resolvedModel.model.provider,
        modelKey: resolvedModel.model.modelKey,
        content: mockResult.content,
        status: 'success',
        inputTokens: mockResult.inputTokens,
        outputTokens: mockResult.outputTokens,
        totalTokens: mockResult.totalTokens,
        cost,
        latency,
        metadata: {},
      });

      const costRecordId = await this.recordCostSafely(request, resolvedModel.model.provider, {
        modelKey: resolvedModel.model.modelKey,
        inputTokens: mockResult.inputTokens,
        outputTokens: mockResult.outputTokens,
        latencyMs: latency,
        status: AiCostRecordStatus.SUCCESS,
        attemptNumber,
      });

      await this.recordUsageSafely(request, resolvedModel.model.provider, {
        modelKey: resolvedModel.model.modelKey,
        inputTokens: mockResult.inputTokens,
        outputTokens: mockResult.outputTokens,
        totalTokens: mockResult.totalTokens,
        latencyMs: latency,
        status: AiUsageRecordStatus.SUCCESS,
        attemptNumber,
        costRecordId,
      });

      return {
        requestId: request.id,
        content: mockResult.content,
        provider: resolvedModel.model.provider,
        modelKey: resolvedModel.model.modelKey,
        inputTokens: mockResult.inputTokens,
        outputTokens: mockResult.outputTokens,
        totalTokens: mockResult.totalTokens,
        cost,
        latency,
        metadata: {},
      };
    } catch (error) {
      const endTime = new Date();
      const latency = endTime.getTime() - startTime.getTime();

      await this.repository.updateExecutionLog(executionLog.id, {
        status: 'failed',
        endTime,
        latency,
        errorCode: (error as any).code || 'EXECUTION_ERROR',
        errorMessage: (error as Error).message,
      });

      const failedCostRecordId = await this.recordCostSafely(request, resolvedModel.model.provider, {
        modelKey: resolvedModel.model.modelKey,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: latency,
        status: AiCostRecordStatus.FAILED,
        attemptNumber,
        errorCode: (error as any).code || 'EXECUTION_ERROR',
      });

      await this.recordUsageSafely(request, resolvedModel.model.provider, {
        modelKey: resolvedModel.model.modelKey,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        latencyMs: latency,
        status: AiUsageRecordStatus.FAILED,
        attemptNumber,
        costRecordId: failedCostRecordId,
        errorCode: (error as any).code || 'EXECUTION_ERROR',
      });

      throw error;
    }
  }

  async findRequestById(
    id: string,
    workspaceId: string,
  ): Promise<IAiRequest> {
    const request = await this.repository.findRequestById(id, workspaceId);
    if (!request) {
      throw new ResourceNotFoundException(
        'AI request not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return request;
  }

  async findAllRequests(
    filter: AiRequestFilterDto,
  ): Promise<PaginatedAiRequestResponseDto> {
    const [data, total] = await this.repository.findAllRequests(filter);

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data as AiRequestResponseDto[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  async cancelRequest(id: string, workspaceId: string): Promise<IAiRequest> {
    const request = await this.findRequestById(id, workspaceId);

    if (
      request.status === AiRequestStatus.COMPLETED ||
      request.status === AiRequestStatus.FAILED ||
      request.status === AiRequestStatus.CANCELLED
    ) {
      throw new BusinessRuleException(
        'Cannot cancel request in current status',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const cancelled = await this.repository.cancelRequest(id, workspaceId);

    await this.eventQueue.publish({
      event: AiOrchestratorEvent.REQUEST_CANCELLED,
      workspaceId: cancelled.workspaceId,
      requestId: cancelled.id,
    });

    return cancelled;
  }

  async deleteRequest(id: string, workspaceId: string): Promise<void> {
    await this.findRequestById(id, workspaceId);
    await this.repository.deleteRequest(id);
  }

  async findExecutionLogs(
    filter: ExecutionLogFilterDto,
  ): Promise<PaginatedExecutionLogResponseDto> {
    const [data, total] = await this.repository.findExecutionLogs(filter);

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data as ExecutionLogResponseDto[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getRequestStats(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    return this.repository.getRequestStats(workspaceId, startDate, endDate);
  }

  async invalidateCache(workspaceId: string, pattern?: string): Promise<number> {
    return this.repository.invalidateCache(workspaceId, pattern);
  }

  private calculateCost(
    inputTokens: number,
    outputTokens: number,
    inputPricePer1k: number,
    outputPricePer1k: number,
  ): number {
    const inputCost = (inputTokens / 1000) * inputPricePer1k;
    const outputCost = (outputTokens / 1000) * outputPricePer1k;
    return inputCost + outputCost;
  }

  /**
   * Records this attempt into the AI cost-tracking ledger. Attribution to an
   * agent/workflow/job/queue execution or a feature/project is read from
   * `requestMetadata`, since callers (agent/workflow/job-scheduler/queue
   * management) attach their own execution ids there rather than the
   * orchestrator's DTO carrying dedicated columns for every caller type.
   * Never allowed to fail the underlying AI execution — a missing pricing
   * configuration or a cost-tracking error is logged, not propagated.
   */
  private async recordCostSafely(
    request: IAiRequest,
    providerKey: string,
    usage: {
      modelKey: string;
      inputTokens: number;
      outputTokens: number;
      latencyMs: number;
      status: AiCostRecordStatus;
      attemptNumber: number;
      errorCode?: string;
    },
  ): Promise<string | undefined> {
    try {
      const attribution = this.extractAttribution(request);

      const record = await this.costTrackingService.recordCost({
        workspaceId: request.workspaceId,
        providerKey,
        modelKey: usage.modelKey,
        capability: request.capability,
        useCase: request.useCase,
        orchestratorRequestId: request.id,
        userId: request.userId ?? undefined,
        feature: attribution.feature,
        projectId: attribution.projectId,
        agentId: attribution.agentId,
        agentExecutionId: attribution.agentExecutionId,
        workflowId: attribution.workflowId,
        workflowExecutionId: attribution.workflowExecutionId,
        jobId: attribution.jobId,
        jobExecutionId: attribution.jobExecutionId,
        queueJobId: attribution.queueJobId,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        latencyMs: usage.latencyMs,
        status: usage.status,
        attemptNumber: usage.attemptNumber,
        isRetry: usage.attemptNumber > 1,
        errorCode: usage.errorCode,
      });

      return record.id;
    } catch (error) {
      this.logger.warn(
        `Cost tracking failed for request ${request.id}: ${(error as Error).message}`,
      );
      return undefined;
    }
  }

  /**
   * Records this attempt into the AI usage/token-tracking ledger, mirroring
   * `recordCostSafely` — same attribution channel (`requestMetadata`), same
   * never-fail-the-request guarantee. Usage here is provider-reported only
   * in the sense that it comes from the (mocked) provider result; real
   * provider integrations should set `source: PROVIDER_REPORTED` once actual
   * provider usage payloads are wired in.
   */
  private async recordUsageSafely(
    request: IAiRequest,
    providerKey: string,
    usage: {
      modelKey: string;
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      latencyMs: number;
      status: AiUsageRecordStatus;
      attemptNumber: number;
      costRecordId?: string;
      errorCode?: string;
    },
  ): Promise<void> {
    try {
      const attribution = this.extractAttribution(request);

      await this.usageTrackingService.recordUsage({
        workspaceId: request.workspaceId,
        providerKey,
        modelKey: usage.modelKey,
        capability: request.capability,
        useCase: request.useCase,
        orchestratorRequestId: request.id,
        userId: request.userId ?? undefined,
        feature: attribution.feature,
        projectId: attribution.projectId,
        agentId: attribution.agentId,
        agentExecutionId: attribution.agentExecutionId,
        workflowId: attribution.workflowId,
        workflowExecutionId: attribution.workflowExecutionId,
        jobId: attribution.jobId,
        jobExecutionId: attribution.jobExecutionId,
        queueJobId: attribution.queueJobId,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        latencyMs: usage.latencyMs,
        status: usage.status,
        attemptNumber: usage.attemptNumber,
        isRetry: usage.attemptNumber > 1,
        source: AiUsageSource.ESTIMATED,
        costRecordId: usage.costRecordId,
        errorCode: usage.errorCode,
      });
    } catch (error) {
      this.logger.warn(
        `Usage tracking failed for request ${request.id}: ${(error as Error).message}`,
      );
    }
  }

  private extractAttribution(request: IAiRequest): {
    feature?: string;
    projectId?: string;
    agentId?: string;
    agentExecutionId?: string;
    workflowId?: string;
    workflowExecutionId?: string;
    jobId?: string;
    jobExecutionId?: string;
    queueJobId?: string;
  } {
    const metadata = (request.requestMetadata ?? {}) as Record<string, unknown>;
    return {
      feature: metadata.feature as string | undefined,
      projectId: metadata.projectId as string | undefined,
      agentId: metadata.agentId as string | undefined,
      agentExecutionId: metadata.agentExecutionId as string | undefined,
      workflowId: metadata.workflowId as string | undefined,
      workflowExecutionId: metadata.workflowExecutionId as string | undefined,
      jobId: metadata.jobId as string | undefined,
      jobExecutionId: metadata.jobExecutionId as string | undefined,
      queueJobId: metadata.queueJobId as string | undefined,
    };
  }

  private buildCacheKey(dto: ExecuteAiRequestDto): string {
    const parts = [
      'exec',
      dto.useCase,
      dto.capability,
      this.hashString(dto.prompt),
    ];

    if (dto.routingStrategy) {
      parts.push(dto.routingStrategy);
    }

    return parts.join(':');
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
