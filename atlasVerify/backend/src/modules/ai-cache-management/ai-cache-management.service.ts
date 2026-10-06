import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { AiCacheManagementRepository } from './ai-cache-management.repository';
import { AiCacheEventQueue } from './jobs';
import {
  CacheLookupDto,
  CacheStoreDto,
  CreateCachePolicyDto,
  UpdateCachePolicyDto,
  CacheInvalidateDto,
  CacheEntryFilterDto,
  CacheLookupResponseDto,
  CacheEntryResponseDto,
  PaginatedCacheEntryResponseDto,
  CachePolicyResponseDto,
  CacheInvalidationResponseDto,
  CacheSavingsResponseDto,
} from './dto';
import {
  IAiCacheEntry,
  IAiCachePolicy,
  ICacheKeyComponents,
  ICacheLookupResult,
  AiCacheScope,
  AiCacheStrategy,
  AiCacheStatus,
  AiCacheEventType,
} from './interfaces';
import { ResourceNotFoundException } from '@common/exceptions/resource-not-found.exception';
import { BusinessRuleException } from '@common/exceptions/business-rule.exception';
import { DuplicateResourceException } from '@common/exceptions/duplicate-resource.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class AiCacheManagementService {
  private readonly logger = new Logger(AiCacheManagementService.name);

  constructor(
    private readonly repository: AiCacheManagementRepository,
    private readonly eventQueue: AiCacheEventQueue,
  ) {}

  async lookup(dto: CacheLookupDto): Promise<CacheLookupResponseDto> {
    if (dto.bypassCache) {
      await this.eventQueue.publish({
        event: AiCacheEventType.BYPASS,
        workspaceId: dto.workspaceId,
        reason: 'User requested cache bypass',
        capability: dto.capability,
      });

      return {
        found: false,
        shouldRevalidate: false,
      };
    }

    const scope = dto.scope || AiCacheScope.WORKSPACE;
    const strategy = dto.strategy || AiCacheStrategy.EXACT_MATCH;

    const policies = await this.repository.findApplicableCachePolicies({
      workspaceId: dto.workspaceId,
      capability: dto.capability,
      useCase: dto.useCase,
      provider: dto.provider,
      model: dto.model,
      scope,
    });

    let policy: IAiCachePolicy | undefined;
    if (policies.length > 0) {
      policy = policies[0];
    }

    if (policy && policy.bypassOnSensitive && this.isSensitiveData(dto.inputData)) {
      await this.eventQueue.publish({
        event: AiCacheEventType.BYPASS,
        workspaceId: dto.workspaceId,
        reason: 'Sensitive data detected',
        capability: dto.capability,
      });

      return {
        found: false,
        shouldRevalidate: false,
      };
    }

    const cacheKey = this.generateCacheKey({
      workspaceId: dto.workspaceId,
      capability: dto.capability,
      useCase: dto.useCase,
      provider: dto.provider,
      model: dto.model,
      promptVersion: dto.promptVersion,
      userId: dto.userId,
      workflowId: dto.workflowId,
      requestId: dto.requestId,
      inputHash: this.hashData(dto.inputData),
      contextHash: dto.contextData ? this.hashData(dto.contextData) : undefined,
      parametersHash: dto.parameters ? this.hashData(dto.parameters) : undefined,
      scope,
    });

    const cacheKeyHash = this.hashString(cacheKey);

    let entry: IAiCacheEntry | null = null;

    if (strategy === AiCacheStrategy.EXACT_MATCH) {
      entry = await this.repository.findCacheEntryByKeyHash(cacheKeyHash, dto.workspaceId);
    } else if (strategy === AiCacheStrategy.SEMANTIC) {
      entry = await this.findSemanticMatch(dto, policy);
    } else if (strategy === AiCacheStrategy.PARTIAL_RESULT) {
      entry = await this.findPartialMatch(dto, policy);
    }

    if (!entry) {
      await this.eventQueue.publish({
        event: AiCacheEventType.MISS,
        workspaceId: dto.workspaceId,
        capability: dto.capability,
        provider: dto.provider,
        model: dto.model,
      });

      await this.repository.createCacheMetrics({
        workspaceId: dto.workspaceId,
        eventType: AiCacheEventType.MISS,
        capability: dto.capability,
        useCase: dto.useCase,
        provider: dto.provider,
        model: dto.model,
        scope,
        strategy,
        userId: dto.userId,
        workflowId: dto.workflowId,
        metadata: {},
      });

      return {
        found: false,
        shouldRevalidate: false,
      };
    }

    const now = new Date();
    const isExpired = entry.expiresAt < now;
    const isStale = entry.staleAt && entry.staleAt < now;

    if (isExpired || entry.status === AiCacheStatus.EXPIRED) {
      await this.eventQueue.publish({
        event: AiCacheEventType.MISS,
        workspaceId: dto.workspaceId,
        capability: dto.capability,
        provider: dto.provider,
        model: dto.model,
      });

      return {
        found: false,
        shouldRevalidate: false,
      };
    }

    const shouldRevalidate = 
      policy?.enableStaleRevalidate && 
      (isStale || entry.status === AiCacheStatus.STALE);

    await this.repository.incrementHitCount(entry.id);

    await this.eventQueue.publish({
      event: AiCacheEventType.HIT,
      workspaceId: dto.workspaceId,
      cacheEntryId: entry.id,
      tokensSaved: entry.tokensUsed,
      costSaved: entry.cost,
      latencySavedMs: entry.latencyMs,
    });

    await this.repository.createCacheMetrics({
      workspaceId: dto.workspaceId,
      cacheEntryId: entry.id,
      eventType: AiCacheEventType.HIT,
      capability: dto.capability,
      useCase: dto.useCase,
      provider: dto.provider,
      model: dto.model,
      scope,
      strategy,
      userId: dto.userId,
      workflowId: dto.workflowId,
      tokensSaved: entry.tokensUsed,
      costSaved: entry.cost,
      latencySavedMs: entry.latencyMs,
      metadata: {},
    });

    if (shouldRevalidate) {
      await this.eventQueue.publish({
        event: AiCacheEventType.REVALIDATE,
        workspaceId: dto.workspaceId,
        cacheEntryId: entry.id,
      });
    }

    return {
      found: true,
      entry: entry as CacheEntryResponseDto,
      status: entry.status,
      shouldRevalidate,
      tokensSaved: entry.tokensUsed,
      costSaved: entry.cost,
      latencySavedMs: entry.latencyMs,
    };
  }

  async store(dto: CacheStoreDto): Promise<CacheEntryResponseDto> {
    const scope = dto.scope || AiCacheScope.WORKSPACE;
    const strategy = dto.strategy || AiCacheStrategy.EXACT_MATCH;

    const policies = await this.repository.findApplicableCachePolicies({
      workspaceId: dto.workspaceId,
      capability: dto.capability,
      useCase: dto.useCase,
      provider: dto.provider,
      model: dto.model,
      scope,
    });

    let policy: IAiCachePolicy | undefined;
    if (policies.length > 0) {
      policy = policies[0];
    }

    if (dto.sensitiveData && policy?.bypassOnSensitive) {
      throw new BusinessRuleException(
        'Cannot cache sensitive data with bypassOnSensitive policy',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const inputHash = this.hashData(dto.inputData);
    const contextHash = dto.contextData ? this.hashData(dto.contextData) : undefined;
    const parametersHash = dto.parameters ? this.hashData(dto.parameters) : undefined;

    const cacheKey = this.generateCacheKey({
      workspaceId: dto.workspaceId,
      capability: dto.capability,
      useCase: dto.useCase,
      provider: dto.provider,
      model: dto.model,
      promptVersion: dto.promptVersion,
      userId: dto.userId,
      workflowId: dto.workflowId,
      requestId: dto.requestId,
      inputHash,
      contextHash,
      parametersHash,
      scope,
    });

    const cacheKeyHash = this.hashString(cacheKey);

    const ttlSeconds = policy?.ttlSeconds || 3600;
    const staleTtlSeconds = policy?.staleTtlSeconds;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
    const staleAt = staleTtlSeconds 
      ? new Date(now.getTime() + staleTtlSeconds * 1000)
      : undefined;

    const entry = await this.repository.createCacheEntry({
      workspaceId: dto.workspaceId,
      cacheKey,
      cacheKeyHash,
      scope,
      strategy,
      status: AiCacheStatus.VALID,
      capability: dto.capability,
      useCase: dto.useCase,
      provider: dto.provider,
      model: dto.model,
      promptVersion: dto.promptVersion,
      userId: dto.userId,
      workflowId: dto.workflowId,
      requestId: dto.requestId,
      inputHash,
      inputData: dto.inputData,
      contextHash,
      contextData: dto.contextData,
      parametersHash,
      parameters: dto.parameters,
      response: dto.response,
      responseMetadata: dto.responseMetadata,
      tokensUsed: dto.tokensUsed,
      cost: dto.cost,
      latencyMs: dto.latencyMs,
      hitCount: 0,
      ttlSeconds,
      expiresAt,
      staleAt,
      policyId: policy?.id,
      policySnapshot: policy || null,
      sensitiveData: dto.sensitiveData || false,
      bypassable: true,
      tags: dto.tags || [],
      metadata: dto.metadata || {},
    });

    await this.eventQueue.publish({
      event: AiCacheEventType.STORE,
      workspaceId: dto.workspaceId,
      cacheEntryId: entry.id,
      scope,
    });

    await this.repository.createCacheMetrics({
      workspaceId: dto.workspaceId,
      cacheEntryId: entry.id,
      eventType: AiCacheEventType.STORE,
      capability: dto.capability,
      useCase: dto.useCase,
      provider: dto.provider,
      model: dto.model,
      scope,
      strategy,
      userId: dto.userId,
      workflowId: dto.workflowId,
      metadata: {},
    });

    return entry as CacheEntryResponseDto;
  }

  async invalidate(dto: CacheInvalidateDto): Promise<CacheInvalidationResponseDto> {
    const startTime = Date.now();

    const count = await this.repository.invalidateCacheEntries({
      workspaceId: dto.workspaceId,
      scope: dto.scope,
      capability: dto.capability,
      useCase: dto.useCase,
      provider: dto.provider,
      model: dto.model,
      promptVersion: dto.promptVersion,
      userId: dto.userId,
      workflowId: dto.workflowId,
    });

    const executionTimeMs = Date.now() - startTime;

    const invalidation = await this.repository.createCacheInvalidation({
      workspaceId: dto.workspaceId,
      reason: dto.reason,
      triggerType: dto.triggerType,
      triggerSource: dto.triggerSource,
      scope: dto.scope,
      capability: dto.capability,
      useCase: dto.useCase,
      provider: dto.provider,
      model: dto.model,
      promptVersion: dto.promptVersion,
      entriesInvalidated: count,
      executionTimeMs,
      metadata: {},
    });

    await this.eventQueue.publish({
      event: AiCacheEventType.INVALIDATE,
      workspaceId: dto.workspaceId,
      invalidationId: invalidation.id,
      entriesInvalidated: count,
    });

    return invalidation as CacheInvalidationResponseDto;
  }

  async findCacheEntryById(
    id: string,
    workspaceId: string,
  ): Promise<CacheEntryResponseDto> {
    const entry = await this.repository.findCacheEntryById(id, workspaceId);
    if (!entry) {
      throw new ResourceNotFoundException(
        'Cache entry not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return entry as CacheEntryResponseDto;
  }

  async findAllCacheEntries(
    filter: CacheEntryFilterDto,
  ): Promise<PaginatedCacheEntryResponseDto> {
    const [data, total] = await this.repository.findAllCacheEntries(filter);

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data as CacheEntryResponseDto[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  async createCachePolicy(dto: CreateCachePolicyDto): Promise<CachePolicyResponseDto> {
    const existing = await this.repository.findCachePolicyByName(
      dto.name,
      dto.workspaceId,
    );

    if (existing) {
      throw new DuplicateResourceException(
        'Cache policy with this name already exists',
        ErrorCode.DUPLICATE_RESOURCE,
      );
    }

    const policy = await this.repository.createCachePolicy({
      workspaceId: dto.workspaceId,
      name: dto.name,
      description: dto.description,
      scope: dto.scope,
      strategy: dto.strategy,
      capability: dto.capability,
      useCase: dto.useCase,
      provider: dto.provider,
      model: dto.model,
      enabled: dto.enabled ?? true,
      priority: dto.priority ?? 0,
      ttlSeconds: dto.ttlSeconds,
      staleTtlSeconds: dto.staleTtlSeconds,
      enableSemanticCache: dto.enableSemanticCache ?? false,
      semanticThreshold: dto.semanticThreshold,
      enablePartialCache: dto.enablePartialCache ?? false,
      enableStaleRevalidate: dto.enableStaleRevalidate ?? false,
      revalidateAsync: dto.revalidateAsync ?? true,
      enableWarmup: dto.enableWarmup ?? false,
      warmupSchedule: dto.warmupSchedule,
      bypassOnError: dto.bypassOnError ?? true,
      bypassOnSensitive: dto.bypassOnSensitive ?? true,
      invalidateOnPromptChange: dto.invalidateOnPromptChange ?? true,
      invalidateOnModelChange: dto.invalidateOnModelChange ?? true,
      invalidateOnProviderChange: dto.invalidateOnProviderChange ?? false,
      invalidateOnConfigChange: dto.invalidateOnConfigChange ?? false,
      invalidateOnDataChange: dto.invalidateOnDataChange ?? false,
      maxCacheSize: dto.maxCacheSize,
      evictionStrategy: dto.evictionStrategy,
      tags: dto.tags || [],
      metadata: dto.metadata || {},
    });

    return policy as CachePolicyResponseDto;
  }

  async updateCachePolicy(
    id: string,
    dto: UpdateCachePolicyDto,
  ): Promise<CachePolicyResponseDto> {
    await this.findCachePolicyById(id);
    const policy = await this.repository.updateCachePolicy(id, dto);
    return policy as CachePolicyResponseDto;
  }

  async deleteCachePolicy(id: string): Promise<void> {
    await this.findCachePolicyById(id);
    await this.repository.deleteCachePolicy(id);
  }

  async findCachePolicyById(id: string): Promise<CachePolicyResponseDto> {
    const policy = await this.repository.findCachePolicyById(id);
    if (!policy) {
      throw new ResourceNotFoundException(
        'Cache policy not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return policy as CachePolicyResponseDto;
  }

  async getCacheSavings(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<CacheSavingsResponseDto> {
    const savings = await this.repository.getCacheSavings(
      workspaceId,
      startDate,
      endDate,
    );
    return savings as CacheSavingsResponseDto;
  }

  async evictExpired(workspaceId: string): Promise<number> {
    const count = await this.repository.evictExpiredCacheEntries(workspaceId);
    this.logger.debug(`Evicted ${count} expired cache entries`);
    return count;
  }

  async markStale(workspaceId: string): Promise<number> {
    const count = await this.repository.markStaleEntries(workspaceId);
    this.logger.debug(`Marked ${count} cache entries as stale`);
    return count;
  }

  private generateCacheKey(components: ICacheKeyComponents): string {
    const parts = [
      `ws:${components.workspaceId}`,
      `cap:${components.capability}`,
      `prov:${components.provider}`,
      `mod:${components.model}`,
      `in:${components.inputHash}`,
      `scope:${components.scope}`,
    ];

    if (components.useCase) parts.push(`uc:${components.useCase}`);
    if (components.promptVersion) parts.push(`pv:${components.promptVersion}`);
    if (components.userId) parts.push(`u:${components.userId}`);
    if (components.workflowId) parts.push(`wf:${components.workflowId}`);
    if (components.requestId) parts.push(`req:${components.requestId}`);
    if (components.contextHash) parts.push(`ctx:${components.contextHash}`);
    if (components.parametersHash) parts.push(`par:${components.parametersHash}`);

    return parts.join('|');
  }

  private hashData(data: unknown): string {
    const json = JSON.stringify(data);
    return this.hashString(json);
  }

  private hashString(str: string): string {
    return createHash('sha256').update(str).digest('hex');
  }

  private isSensitiveData(data: unknown): boolean {
    const json = JSON.stringify(data).toLowerCase();
    const sensitivePatterns = [
      'password',
      'secret',
      'token',
      'api_key',
      'apikey',
      'credit_card',
      'ssn',
    ];

    return sensitivePatterns.some((pattern) => json.includes(pattern));
  }

  private async findSemanticMatch(
    dto: CacheLookupDto,
    policy?: IAiCachePolicy,
  ): Promise<IAiCacheEntry | null> {
    return null;
  }

  private async findPartialMatch(
    dto: CacheLookupDto,
    policy?: IAiCachePolicy,
  ): Promise<IAiCacheEntry | null> {
    return null;
  }
}
