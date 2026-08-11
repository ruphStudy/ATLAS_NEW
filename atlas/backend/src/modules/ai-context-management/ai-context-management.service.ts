import { Injectable, Logger } from '@nestjs/common';
import { AiContextManagementRepository } from './ai-context-management.repository';
import { AiContextEventQueue } from './jobs';
import {
  CreateAiContextDto,
  UpdateAiContextDto,
  ContextFilterDto,
  ResolveContextDto,
  MergeContextDto,
  AiContextResponseDto,
  PaginatedContextResponseDto,
  ContextMergeResultDto,
  ContextSummaryResultDto,
} from './dto';
import {
  IAiContext,
  IAiContextVersion,
  AiContextStatus,
  AiContextPriority,
  AiContextEvent,
  IContextMergeResult,
  IContextSummaryResult,
  IConversationMessage,
} from './interfaces';
import { ResourceNotFoundException } from '@common/exceptions/resource-not-found.exception';
import { BusinessRuleException } from '@common/exceptions/business-rule.exception';
import { DuplicateResourceException } from '@common/exceptions/duplicate-resource.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class AiContextManagementService {
  private readonly logger = new Logger(AiContextManagementService.name);

  constructor(
    private readonly repository: AiContextManagementRepository,
    private readonly eventQueue: AiContextEventQueue,
  ) {}

  async createContext(dto: CreateAiContextDto): Promise<IAiContext> {
    if (dto.correlationId) {
      const existing = await this.repository.findContextByCorrelationId(
        dto.correlationId,
        dto.workspaceId,
      );

      if (existing) {
        throw new DuplicateResourceException(
          'Context with this correlation ID already exists',
          ErrorCode.DUPLICATE_RESOURCE,
        );
      }
    }

    const sizeBytes = this.calculateSize(dto);
    const tokenEstimate = this.estimateTokens(dto);

    const data = {
      workspaceId: dto.workspaceId,
      type: dto.type,
      status: AiContextStatus.ACTIVE,
      priority: dto.priority || AiContextPriority.NORMAL,
      correlationId: dto.correlationId,
      parentContextId: dto.parentContextId,
      userId: dto.userId,
      sessionId: dto.sessionId,
      workflowExecutionId: dto.workflowExecutionId,
      agentExecutionId: dto.agentExecutionId,
      taskId: dto.taskId,
      variables: dto.variables || null,
      conversationHistory: dto.conversationHistory || null,
      toolResults: dto.toolResults || null,
      businessReferences: dto.businessReferences || null,
      executionMetadata: dto.executionMetadata || null,
      version: 1,
      sizeBytes,
      tokenEstimate,
      maxTokens: dto.maxTokens,
      windowSize: dto.windowSize,
      source: dto.source,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      lastAccessedAt: new Date(),
      allowInheritance: dto.allowInheritance ?? true,
      allowBranching: dto.allowBranching ?? true,
      tags: dto.tags || [],
      metadata: dto.metadata || {},
    };

    const context = (await this.repository.createContext(data)) as IAiContext;

    await this.createVersion(context, 'Initial creation', null);

    await this.eventQueue.publish({
      event: AiContextEvent.CONTEXT_CREATED,
      workspaceId: context.workspaceId,
      contextId: context.id,
      version: 1,
    });

    return context;
  }

  async updateContext(
    id: string,
    workspaceId: string,
    dto: UpdateAiContextDto,
  ): Promise<IAiContext> {
    const context = await this.findContextById(id, workspaceId);

    const updateData: any = {};

    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.variables !== undefined) updateData.variables = dto.variables;
    if (dto.conversationHistory !== undefined) {
      updateData.conversationHistory = dto.conversationHistory;
    }
    if (dto.toolResults !== undefined) updateData.toolResults = dto.toolResults;
    if (dto.businessReferences !== undefined) {
      updateData.businessReferences = dto.businessReferences;
    }
    if (dto.executionMetadata !== undefined) {
      updateData.executionMetadata = dto.executionMetadata;
    }
    if (dto.summary !== undefined) updateData.summary = dto.summary;
    if (dto.maxTokens !== undefined) updateData.maxTokens = dto.maxTokens;
    if (dto.windowSize !== undefined) updateData.windowSize = dto.windowSize;
    if (dto.expiresAt !== undefined) {
      updateData.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    }
    if (dto.allowInheritance !== undefined) {
      updateData.allowInheritance = dto.allowInheritance;
    }
    if (dto.allowBranching !== undefined) {
      updateData.allowBranching = dto.allowBranching;
    }
    if (dto.tags !== undefined) updateData.tags = dto.tags;
    if (dto.metadata !== undefined) updateData.metadata = dto.metadata;

    updateData.version = context.version + 1;
    updateData.sizeBytes = this.calculateSize({
      ...context,
      ...updateData,
    });
    updateData.tokenEstimate = this.estimateTokens({
      ...context,
      ...updateData,
    });

    const updated = (await this.repository.updateContext(
      id,
      updateData,
    )) as IAiContext;

    await this.createVersion(updated, dto.changeReason || 'Update', dto.changedBy);

    await this.repository.invalidateCache(id);

    await this.eventQueue.publish({
      event: AiContextEvent.CONTEXT_UPDATED,
      workspaceId: updated.workspaceId,
      contextId: updated.id,
      version: updated.version,
    });

    return updated;
  }

  async resolveContext(dto: ResolveContextDto): Promise<IAiContext | null> {
    const context = await this.repository.resolveContext(dto);

    if (context) {
      await this.repository.updateLastAccessed(context.id);

      await this.eventQueue.publish({
        event: AiContextEvent.CONTEXT_ACCESSED,
        workspaceId: context.workspaceId,
        contextId: context.id,
      });
    }

    return context;
  }

  async mergeContexts(dto: MergeContextDto): Promise<IContextMergeResult> {
    const targetContext = await this.findContextById(
      dto.targetContextId,
      dto.workspaceId,
    );

    const sourceContexts = await Promise.all(
      dto.sourceContextIds.map((id) =>
        this.findContextById(id, dto.workspaceId),
      ),
    );

    const mergeStrategy = dto.mergeStrategy || 'merge';

    let mergedVariables = targetContext.variables || {};
    let mergedHistory = (targetContext.conversationHistory as any[]) || [];
    let mergedToolResults = targetContext.toolResults || {};

    for (const source of sourceContexts) {
      if (mergeStrategy === 'replace') {
        mergedVariables = source.variables || {};
        mergedHistory = (source.conversationHistory as any[]) || [];
        mergedToolResults = source.toolResults || {};
      } else if (mergeStrategy === 'append') {
        const sourceHistory = (source.conversationHistory as any[]) || [];
        mergedHistory = [...mergedHistory, ...sourceHistory];
      } else {
        mergedVariables = {
          ...mergedVariables,
          ...(source.variables || {}),
        };
        const sourceHistory = (source.conversationHistory as any[]) || [];
        mergedHistory = [...mergedHistory, ...sourceHistory];
        mergedToolResults = {
          ...mergedToolResults,
          ...(source.toolResults || {}),
        };
      }
    }

    const updated = await this.updateContext(
      dto.targetContextId,
      dto.workspaceId,
      {
        variables: mergedVariables,
        conversationHistory: mergedHistory,
        toolResults: mergedToolResults,
        changeReason: 'Context merge',
      },
    );

    await this.eventQueue.publish({
      event: AiContextEvent.CONTEXT_MERGED,
      workspaceId: dto.workspaceId,
      contextId: dto.targetContextId,
      version: updated.version,
    });

    return {
      contextId: updated.id,
      version: updated.version,
      mergedVariables,
      tokensAdded: 0,
      tokenEstimate: updated.tokenEstimate || 0,
    };
  }

  async summarizeContext(
    id: string,
    workspaceId: string,
  ): Promise<IContextSummaryResult> {
    const context = await this.findContextById(id, workspaceId);

    const originalTokens = context.tokenEstimate || 0;

    const summary = this.generateSummary(context);
    const summaryTokens = this.estimateTokens({ summary });

    await this.updateContext(id, workspaceId, {
      summary,
      status: AiContextStatus.SUMMARIZED,
      changeReason: 'Auto-summarization',
    });

    await this.eventQueue.publish({
      event: AiContextEvent.CONTEXT_SUMMARIZED,
      workspaceId,
      contextId: id,
    });

    return {
      contextId: id,
      summary,
      originalTokens,
      summaryTokens,
      compressionRatio: originalTokens > 0 ? summaryTokens / originalTokens : 0,
    };
  }

  async trimContext(
    id: string,
    workspaceId: string,
    maxTokens: number,
  ): Promise<IAiContext> {
    const context = await this.findContextById(id, workspaceId);

    if (!context.conversationHistory) {
      return context;
    }

    const history = context.conversationHistory as IConversationMessage[];
    const trimmedHistory = this.trimConversationHistory(history, maxTokens);

    const updated = await this.updateContext(id, workspaceId, {
      conversationHistory: trimmedHistory,
      changeReason: 'Token limit exceeded - auto-trim',
    });

    await this.eventQueue.publish({
      event: AiContextEvent.CONTEXT_TRIMMED,
      workspaceId,
      contextId: id,
    });

    return updated;
  }

  async branchContext(
    id: string,
    workspaceId: string,
    newCorrelationId?: string,
  ): Promise<IAiContext> {
    const sourceContext = await this.findContextById(id, workspaceId);

    if (!sourceContext.allowBranching) {
      throw new BusinessRuleException(
        'Context branching is not allowed',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const branchedContext = await this.createContext({
      workspaceId,
      type: sourceContext.type,
      priority: sourceContext.priority,
      correlationId: newCorrelationId,
      parentContextId: sourceContext.id,
      userId: sourceContext.userId || undefined,
      sessionId: sourceContext.sessionId || undefined,
      variables: sourceContext.variables,
      conversationHistory: sourceContext.conversationHistory as any,
      toolResults: sourceContext.toolResults,
      businessReferences: sourceContext.businessReferences,
      executionMetadata: sourceContext.executionMetadata,
      maxTokens: sourceContext.maxTokens || undefined,
      windowSize: sourceContext.windowSize || undefined,
      tags: sourceContext.tags,
      metadata: { ...sourceContext.metadata, branchedFrom: sourceContext.id },
    });

    await this.eventQueue.publish({
      event: AiContextEvent.CONTEXT_BRANCHED,
      workspaceId,
      contextId: branchedContext.id,
      metadata: { sourceContextId: id },
    });

    return branchedContext;
  }

  async expireContext(id: string, workspaceId: string): Promise<IAiContext> {
    const context = await this.findContextById(id, workspaceId);

    const expired = await this.repository.updateContext(id, {
      status: AiContextStatus.EXPIRED,
    });

    await this.repository.invalidateCache(id);

    await this.eventQueue.publish({
      event: AiContextEvent.CONTEXT_EXPIRED,
      workspaceId,
      contextId: id,
    });

    return expired as IAiContext;
  }

  async archiveContext(id: string, workspaceId: string): Promise<IAiContext> {
    const context = await this.findContextById(id, workspaceId);

    const archived = await this.repository.updateContext(id, {
      status: AiContextStatus.ARCHIVED,
    });

    await this.repository.invalidateCache(id);

    await this.eventQueue.publish({
      event: AiContextEvent.CONTEXT_ARCHIVED,
      workspaceId,
      contextId: id,
    });

    return archived as IAiContext;
  }

  async deleteContext(id: string, workspaceId: string): Promise<void> {
    await this.findContextById(id, workspaceId);
    await this.repository.deleteContext(id);
    await this.repository.invalidateCache(id);
  }

  async findContextById(id: string, workspaceId: string): Promise<IAiContext> {
    const context = await this.repository.findContextById(id, workspaceId);
    if (!context) {
      throw new ResourceNotFoundException(
        'Context not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return context;
  }

  async findAllContexts(
    filter: ContextFilterDto,
  ): Promise<PaginatedContextResponseDto> {
    const [data, total] = await this.repository.findAllContexts(filter);

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data as AiContextResponseDto[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getContextVersions(
    id: string,
    workspaceId: string,
  ): Promise<IAiContextVersion[]> {
    await this.findContextById(id, workspaceId);
    return this.repository.findVersionsByContextId(id);
  }

  async getCachedContext(cacheKey: string): Promise<any | null> {
    const cached = await this.repository.findCacheByCacheKey(cacheKey);

    if (cached) {
      await this.repository.updateCacheHit(cached.id);
      return cached.cachedData;
    }

    return null;
  }

  async setCachedContext(
    contextId: string,
    workspaceId: string,
    cacheKey: string,
    data: unknown,
    ttl?: number,
  ): Promise<void> {
    await this.repository.createCacheEntry({
      contextId,
      workspaceId,
      cacheKey,
      cachedData: data,
      ttl,
      expiresAt: ttl ? new Date(Date.now() + ttl * 1000) : null,
      metadata: {},
    });
  }

  async invalidateContextCache(id: string, workspaceId: string): Promise<void> {
    await this.findContextById(id, workspaceId);
    await this.repository.invalidateCache(id);

    await this.eventQueue.publish({
      event: AiContextEvent.CONTEXT_INVALIDATED,
      workspaceId,
      contextId: id,
    });
  }

  async getContextStats(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    return this.repository.getContextStats(workspaceId, startDate, endDate);
  }

  private async createVersion(
    context: IAiContext,
    changeReason?: string | null,
    changedBy?: string | null,
  ): Promise<IAiContextVersion> {
    const version = await this.repository.createVersion({
      contextId: context.id,
      workspaceId: context.workspaceId,
      version: context.version,
      variables: context.variables,
      conversationHistory: context.conversationHistory,
      toolResults: context.toolResults,
      businessReferences: context.businessReferences,
      executionMetadata: context.executionMetadata,
      summary: context.summary,
      sizeBytes: context.sizeBytes,
      tokenEstimate: context.tokenEstimate,
      changeReason,
      changedBy,
      metadata: {},
    });

    await this.eventQueue.publish({
      event: AiContextEvent.VERSION_CREATED,
      workspaceId: context.workspaceId,
      contextId: context.id,
      version: context.version,
    });

    return version;
  }

  private calculateSize(data: any): number {
    return JSON.stringify(data).length;
  }

  private estimateTokens(data: any): number {
    const text = JSON.stringify(data);
    return Math.ceil(text.length / 4);
  }

  private generateSummary(context: IAiContext): string {
    const parts: string[] = [];

    if (context.variables) {
      const varCount = Object.keys(context.variables).length;
      parts.push(`${varCount} variables`);
    }

    if (context.conversationHistory) {
      const historyArray = context.conversationHistory as any[];
      parts.push(`${historyArray.length} messages`);
    }

    if (context.toolResults) {
      const toolCount = Object.keys(context.toolResults).length;
      parts.push(`${toolCount} tool results`);
    }

    return `Context summary: ${parts.join(', ')}`;
  }

  private trimConversationHistory(
    history: IConversationMessage[],
    maxTokens: number,
  ): IConversationMessage[] {
    let currentTokens = 0;
    const trimmed: IConversationMessage[] = [];

    for (let i = history.length - 1; i >= 0; i--) {
      const message = history[i];
      const messageTokens = Math.ceil(message.content.length / 4);

      if (currentTokens + messageTokens > maxTokens) {
        break;
      }

      trimmed.unshift(message);
      currentTokens += messageTokens;
    }

    return trimmed;
  }
}
