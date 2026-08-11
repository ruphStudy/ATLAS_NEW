import { Injectable, Logger } from '@nestjs/common';
import { AiPromptRepository } from './ai-prompt.repository';
import { AiPromptEventQueue } from './jobs';
import {
  CreateAiPromptDto,
  UpdateAiPromptDto,
  AiPromptFilterDto,
  ResolvePromptDto,
  CompilePromptDto,
  CreatePromptVersionDto,
  RollbackPromptDto,
  AiPromptResponseDto,
  PaginatedAiPromptResponseDto,
  PromptVersionResponseDto,
  ResolvedPromptResponseDto,
  CompiledPromptResponseDto,
  PromptStatsResponseDto,
} from './dto';
import {
  IAiPrompt,
  IAiPromptVersion,
  IResolvedPrompt,
  AiPromptStatus,
  AiPromptEvent,
} from './interfaces';
import { ResourceNotFoundException } from '@common/exceptions/resource-not-found.exception';
import { BusinessRuleException } from '@common/exceptions/business-rule.exception';
import { DuplicateResourceException } from '@common/exceptions/duplicate-resource.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class AiPromptService {
  private readonly logger = new Logger(AiPromptService.name);
  private readonly CACHE_TTL_MINUTES = 30;

  constructor(
    private readonly repository: AiPromptRepository,
    private readonly eventQueue: AiPromptEventQueue,
  ) {}

  async createPrompt(dto: CreateAiPromptDto): Promise<IAiPrompt> {
    const existing = await this.repository.findPromptByKey(
      dto.key,
      dto.workspaceId,
    );

    if (existing) {
      throw new DuplicateResourceException(
        'Prompt with this key already exists',
        ErrorCode.DUPLICATE_RESOURCE,
      );
    }

    const data = {
      workspaceId: dto.workspaceId || null,
      key: dto.key,
      name: dto.name,
      description: dto.description,
      type: dto.type,
      useCase: dto.useCase,
      capability: dto.capability,
      agentId: dto.agentId,
      version: 1,
      status: AiPromptStatus.DRAFT,
      template: dto.template,
      variables: dto.variables || [],
      requiredVariables: dto.requiredVariables || [],
      inputSchema: dto.inputSchema || null,
      outputSchema: dto.outputSchema || null,
      locale: dto.locale || 'en',
      modelOverrides: dto.modelOverrides || null,
      effectiveFrom: dto.effectiveFrom,
      effectiveUntil: dto.effectiveUntil,
      parentPromptId: dto.parentPromptId,
      usageCount: 0,
      qualityScore: null,
      failureCount: 0,
      tags: dto.tags || [],
      metadata: dto.metadata || {},
      publishedAt: null,
      publishedBy: null,
      createdBy: dto.createdBy,
    };

    const prompt = (await this.repository.createPrompt(data)) as IAiPrompt;

    await this.repository.createVersion({
      promptId: prompt.id,
      version: 1,
      template: prompt.template,
      variables: prompt.variables,
      requiredVariables: prompt.requiredVariables,
      inputSchema: prompt.inputSchema,
      outputSchema: prompt.outputSchema,
      modelOverrides: prompt.modelOverrides,
      changeDescription: 'Initial version',
      createdBy: dto.createdBy,
    });

    await this.eventQueue.publish({
      event: AiPromptEvent.PROMPT_CREATED,
      workspaceId: prompt.workspaceId || undefined,
      promptId: prompt.id,
      version: prompt.version,
    });

    return prompt;
  }

  async updatePrompt(
    id: string,
    dto: UpdateAiPromptDto,
    workspaceId?: string,
  ): Promise<IAiPrompt> {
    await this.findPromptById(id, workspaceId);

    const updated = (await this.repository.updatePrompt(id, dto)) as IAiPrompt;

    await this.eventQueue.publish({
      event: AiPromptEvent.PROMPT_UPDATED,
      workspaceId: updated.workspaceId || undefined,
      promptId: updated.id,
      version: updated.version,
    });

    await this.invalidateCache(updated.workspaceId || undefined, updated.key);

    return updated;
  }

  async publishPrompt(
    id: string,
    workspaceId?: string,
    publishedBy?: string,
  ): Promise<IAiPrompt> {
    const prompt = await this.findPromptById(id, workspaceId);

    if (prompt.status === AiPromptStatus.ACTIVE) {
      throw new BusinessRuleException(
        'Prompt is already published',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const published = await this.repository.updatePrompt(id, {
      status: AiPromptStatus.ACTIVE,
      publishedAt: new Date(),
      publishedBy,
    });

    await this.eventQueue.publish({
      event: AiPromptEvent.PROMPT_PUBLISHED,
      workspaceId: published.workspaceId || undefined,
      promptId: published.id,
      version: published.version,
      status: 'active',
    });

    await this.invalidateCache(published.workspaceId || undefined, published.key);

    return published as IAiPrompt;
  }

  async deprecatePrompt(id: string, workspaceId?: string): Promise<IAiPrompt> {
    const prompt = await this.findPromptById(id, workspaceId);

    const deprecated = await this.repository.updatePrompt(id, {
      status: AiPromptStatus.DEPRECATED,
    });

    await this.eventQueue.publish({
      event: AiPromptEvent.PROMPT_DEPRECATED,
      workspaceId: deprecated.workspaceId || undefined,
      promptId: deprecated.id,
      version: deprecated.version,
    });

    await this.invalidateCache(deprecated.workspaceId || undefined, deprecated.key);

    return deprecated as IAiPrompt;
  }

  async archivePrompt(id: string, workspaceId?: string): Promise<IAiPrompt> {
    const prompt = await this.findPromptById(id, workspaceId);

    const archived = await this.repository.updatePrompt(id, {
      status: AiPromptStatus.ARCHIVED,
    });

    await this.eventQueue.publish({
      event: AiPromptEvent.PROMPT_ARCHIVED,
      workspaceId: archived.workspaceId || undefined,
      promptId: archived.id,
      version: archived.version,
    });

    await this.invalidateCache(archived.workspaceId || undefined, archived.key);

    return archived as IAiPrompt;
  }

  async deletePrompt(id: string, workspaceId?: string): Promise<void> {
    const prompt = await this.findPromptById(id, workspaceId);
    await this.repository.deletePrompt(id);
    await this.invalidateCache(prompt.workspaceId || undefined, prompt.key);
  }

  async findPromptById(id: string, workspaceId?: string): Promise<IAiPrompt> {
    const prompt = await this.repository.findPromptById(id, workspaceId);
    if (!prompt) {
      throw new ResourceNotFoundException(
        'Prompt not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return prompt;
  }

  async findAllPrompts(
    filter: AiPromptFilterDto,
  ): Promise<PaginatedAiPromptResponseDto> {
    const [data, total] = await this.repository.findAllPrompts(filter);

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data as AiPromptResponseDto[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  async createVersion(dto: CreatePromptVersionDto): Promise<IAiPromptVersion> {
    const prompt = await this.findPromptById(dto.promptId);

    const latestVersion = await this.repository.getLatestVersionNumber(
      dto.promptId,
    );
    const newVersion = latestVersion + 1;

    const version = await this.repository.createVersion({
      promptId: dto.promptId,
      version: newVersion,
      template: dto.template,
      variables: dto.variables || [],
      requiredVariables: dto.requiredVariables || [],
      inputSchema: dto.inputSchema || null,
      outputSchema: dto.outputSchema || null,
      modelOverrides: dto.modelOverrides || null,
      changeDescription: dto.changeDescription,
      createdBy: dto.createdBy,
    });

    await this.repository.updatePrompt(dto.promptId, {
      version: newVersion,
      template: dto.template,
      variables: dto.variables || [],
      requiredVariables: dto.requiredVariables || [],
      inputSchema: dto.inputSchema || null,
      outputSchema: dto.outputSchema || null,
      modelOverrides: dto.modelOverrides || null,
    });

    await this.eventQueue.publish({
      event: AiPromptEvent.VERSION_CREATED,
      workspaceId: prompt.workspaceId || undefined,
      promptId: dto.promptId,
      version: newVersion,
    });

    await this.invalidateCache(prompt.workspaceId || undefined, prompt.key);

    return version as IAiPromptVersion;
  }

  async rollbackPrompt(dto: RollbackPromptDto): Promise<IAiPrompt> {
    const prompt = await this.findPromptById(dto.promptId, dto.workspaceId);

    const targetVersion = await this.repository.findVersionByNumber(
      dto.promptId,
      dto.targetVersion,
    );

    if (!targetVersion) {
      throw new ResourceNotFoundException(
        'Target version not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    const rolledBack = await this.repository.updatePrompt(dto.promptId, {
      version: targetVersion.version,
      template: targetVersion.template,
      variables: targetVersion.variables,
      requiredVariables: targetVersion.requiredVariables,
      inputSchema: targetVersion.inputSchema,
      outputSchema: targetVersion.outputSchema,
      modelOverrides: targetVersion.modelOverrides,
    });

    await this.eventQueue.publish({
      event: AiPromptEvent.ROLLBACK_EXECUTED,
      workspaceId: prompt.workspaceId || undefined,
      promptId: dto.promptId,
      version: dto.targetVersion,
    });

    await this.invalidateCache(prompt.workspaceId || undefined, prompt.key);

    return rolledBack as IAiPrompt;
  }

  async findVersionsByPromptId(
    promptId: string,
  ): Promise<PromptVersionResponseDto[]> {
    const versions = await this.repository.findVersionsByPromptId(promptId);
    return versions as PromptVersionResponseDto[];
  }

  async resolvePrompt(dto: ResolvePromptDto): Promise<ResolvedPromptResponseDto> {
    const cacheKey = this.buildCacheKey('resolve', dto);

    const cached = await this.repository.getCachedPrompt(cacheKey);
    if (cached) {
      return cached as unknown as ResolvedPromptResponseDto;
    }

    const effectiveDate = dto.effectiveDate || new Date();

    const prompt = await this.repository.resolvePrompt({
      workspaceId: dto.workspaceId,
      key: dto.key,
      useCase: dto.useCase,
      capability: dto.capability,
      agentId: dto.agentId,
      locale: dto.locale,
      effectiveDate,
    });

    if (!prompt) {
      throw new ResourceNotFoundException(
        'No matching prompt found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    const resolvedFrom = prompt.workspaceId === dto.workspaceId
      ? 'workspace'
      : prompt.workspaceId === null
      ? 'global'
      : 'default';

    const resolved: ResolvedPromptResponseDto = {
      prompt: prompt as AiPromptResponseDto,
      compiledTemplate: prompt.template,
      variables: (prompt.variables as string[]) || [],
      requiredVariables: (prompt.requiredVariables as string[]) || [],
      resolvedFrom,
    };

    await this.repository.setCachedPrompt(
      dto.workspaceId || null,
      cacheKey,
      resolved as unknown as Record<string, unknown>,
      this.CACHE_TTL_MINUTES,
    );

    await this.eventQueue.publish({
      event: AiPromptEvent.PROMPT_RESOLVED,
      workspaceId: dto.workspaceId,
      promptId: prompt.id,
    });

    return resolved;
  }

  async compilePrompt(dto: CompilePromptDto): Promise<CompiledPromptResponseDto> {
    const prompt = await this.findPromptById(dto.promptId, dto.workspaceId);

    const requiredVars = (prompt.requiredVariables as string[]) || [];
    const providedVars = Object.keys(dto.variables);

    const missingVars = requiredVars.filter((v) => !providedVars.includes(v));
    if (missingVars.length > 0) {
      throw new BusinessRuleException(
        `Missing required variables: ${missingVars.join(', ')}`,
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    let compiled = prompt.template;
    for (const [key, value] of Object.entries(dto.variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      compiled = compiled.replace(regex, String(value));
    }

    return {
      promptId: prompt.id,
      version: prompt.version,
      compiled,
      variables: dto.variables,
    };
  }

  async trackUsage(
    promptId: string,
    workspaceId: string,
    data: {
      version: number;
      executionId?: string;
      agentExecutionId?: string;
      variables?: unknown;
      success: boolean;
      inputTokens?: number;
      outputTokens?: number;
      cost?: number;
      latency?: number;
      errorCode?: string;
      errorMessage?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.repository.trackUsage({
      workspaceId,
      promptId,
      version: data.version,
      executionId: data.executionId,
      agentExecutionId: data.agentExecutionId,
      variables: data.variables || null,
      success: data.success,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      cost: data.cost,
      latency: data.latency,
      errorCode: data.errorCode,
      errorMessage: data.errorMessage,
      metadata: data.metadata || {},
    });

    await this.repository.incrementUsageCount(promptId);

    if (!data.success) {
      await this.repository.incrementFailureCount(promptId);
    }

    await this.eventQueue.publish({
      event: AiPromptEvent.USAGE_TRACKED,
      workspaceId,
      promptId,
      version: data.version,
    });
  }

  async getPromptStats(
    promptId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<PromptStatsResponseDto> {
    const stats = await this.repository.getPromptStats(
      promptId,
      startDate,
      endDate,
    );

    const successRate =
      stats.totalUsage > 0
        ? (stats.successCount / stats.totalUsage) * 100
        : 0;

    const qualityScore = successRate > 0 ? successRate / 100 : 0;

    await this.repository.updateQualityScore(promptId, qualityScore);

    return {
      totalUsage: stats.totalUsage,
      successRate,
      averageTokens: stats.averageTokens,
      totalCost: stats.totalCost,
      qualityScore,
    };
  }

  async invalidateCache(workspaceId?: string, pattern?: string): Promise<number> {
    const searchPattern = pattern || (workspaceId ? `prompt:${workspaceId}` : 'prompt:');
    const count = await this.repository.invalidateCache(searchPattern);

    await this.eventQueue.publish({
      event: AiPromptEvent.CACHE_INVALIDATED,
      workspaceId,
    });

    return count;
  }

  private buildCacheKey(prefix: string, filter: Record<string, unknown>): string {
    const parts = [prefix];

    if (filter.workspaceId) parts.push(`w:${filter.workspaceId}`);
    if (filter.key) parts.push(`k:${filter.key}`);
    if (filter.useCase) parts.push(`u:${filter.useCase}`);
    if (filter.capability) parts.push(`c:${filter.capability}`);
    if (filter.agentId) parts.push(`a:${filter.agentId}`);
    if (filter.locale) parts.push(`l:${filter.locale}`);

    return `prompt:${parts.join(':')}`;
  }
}
