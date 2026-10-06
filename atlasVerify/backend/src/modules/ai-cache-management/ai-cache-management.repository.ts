import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { BaseRepository } from '@database/base.repository';
import {
  IAiCacheEntry,
  IAiCachePolicy,
  IAiCacheMetrics,
  IAiCacheInvalidation,
  AiCacheScope,
  AiCacheStrategy,
  AiCacheStatus,
  AiCacheEventType,
  ICacheSavings,
} from './interfaces';
import { CacheEntryFilterDto } from './dto';

@Injectable()
export class AiCacheManagementRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async createCacheEntry(data: Partial<IAiCacheEntry>): Promise<IAiCacheEntry> {
    return this.prisma.aiCacheEntry.create({ data: data as any }) as Promise<IAiCacheEntry>;
  }

  async findCacheEntryByKey(
    cacheKey: string,
    workspaceId: string,
  ): Promise<IAiCacheEntry | null> {
    return this.prisma.aiCacheEntry.findFirst({
      where: {
        cacheKey,
        workspaceId,
        status: { not: AiCacheStatus.INVALIDATED },
      },
    }) as Promise<IAiCacheEntry | null>;
  }

  async findCacheEntryByKeyHash(
    cacheKeyHash: string,
    workspaceId: string,
  ): Promise<IAiCacheEntry | null> {
    return this.prisma.aiCacheEntry.findFirst({
      where: {
        cacheKeyHash,
        workspaceId,
        status: { not: AiCacheStatus.INVALIDATED },
      },
    }) as Promise<IAiCacheEntry | null>;
  }

  async findCacheEntryById(
    id: string,
    workspaceId: string,
  ): Promise<IAiCacheEntry | null> {
    return this.prisma.aiCacheEntry.findFirst({
      where: { id, workspaceId },
    }) as Promise<IAiCacheEntry | null>;
  }

  async findAllCacheEntries(
    filter: CacheEntryFilterDto,
  ): Promise<[IAiCacheEntry[], number]> {
    const where: any = {
      workspaceId: filter.workspaceId,
    };

    if (filter.scope) where.scope = filter.scope;
    if (filter.strategy) where.strategy = filter.strategy;
    if (filter.status) where.status = filter.status;
    if (filter.capability) where.capability = filter.capability;
    if (filter.useCase) where.useCase = filter.useCase;
    if (filter.provider) where.provider = filter.provider;
    if (filter.model) where.model = filter.model;
    if (filter.userId) where.userId = filter.userId;
    if (filter.workflowId) where.workflowId = filter.workflowId;
    if (filter.sensitiveData !== undefined) where.sensitiveData = filter.sensitiveData;

    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) where.createdAt.gte = new Date(filter.startDate);
      if (filter.endDate) where.createdAt.lte = new Date(filter.endDate);
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.aiCacheEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aiCacheEntry.count({ where }),
    ]);

    return [data as IAiCacheEntry[], total];
  }

  async updateCacheEntry(
    id: string,
    data: Partial<IAiCacheEntry>,
  ): Promise<IAiCacheEntry> {
    return this.prisma.aiCacheEntry.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiCacheEntry>;
  }

  async deleteCacheEntry(id: string): Promise<void> {
    await this.prisma.aiCacheEntry.delete({ where: { id } });
  }

  async incrementHitCount(id: string): Promise<void> {
    await this.prisma.aiCacheEntry.update({
      where: { id },
      data: {
        hitCount: { increment: 1 },
        lastHitAt: new Date(),
      },
    });
  }

  async createCachePolicy(data: Partial<IAiCachePolicy>): Promise<IAiCachePolicy> {
    return this.prisma.aiCachePolicy.create({ data: data as any }) as Promise<IAiCachePolicy>;
  }

  async findCachePolicyById(id: string): Promise<IAiCachePolicy | null> {
    return this.prisma.aiCachePolicy.findFirst({
      where: { id, deletedAt: null },
    }) as Promise<IAiCachePolicy | null>;
  }

  async findCachePolicyByName(
    name: string,
    workspaceId: string,
  ): Promise<IAiCachePolicy | null> {
    return this.prisma.aiCachePolicy.findFirst({
      where: { name, workspaceId, deletedAt: null },
    }) as Promise<IAiCachePolicy | null>;
  }

  async findApplicableCachePolicies(filters: {
    workspaceId: string;
    capability?: string;
    useCase?: string;
    provider?: string;
    model?: string;
    scope?: AiCacheScope;
  }): Promise<IAiCachePolicy[]> {
    const where: any = {
      workspaceId: filters.workspaceId,
      enabled: true,
      deletedAt: null,
    };

    if (filters.capability) {
      where.OR = [
        { capability: filters.capability },
        { capability: null },
      ];
    }

    if (filters.useCase) {
      where.OR = where.OR || [];
      where.OR.push(
        { useCase: filters.useCase },
        { useCase: null },
      );
    }

    if (filters.provider) {
      where.OR = where.OR || [];
      where.OR.push(
        { provider: filters.provider },
        { provider: null },
      );
    }

    if (filters.model) {
      where.OR = where.OR || [];
      where.OR.push(
        { model: filters.model },
        { model: null },
      );
    }

    if (filters.scope) {
      where.scope = filters.scope;
    }

    return this.prisma.aiCachePolicy.findMany({
      where,
      orderBy: { priority: 'desc' },
    }) as Promise<IAiCachePolicy[]>;
  }

  async updateCachePolicy(
    id: string,
    data: Partial<IAiCachePolicy>,
  ): Promise<IAiCachePolicy> {
    return this.prisma.aiCachePolicy.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiCachePolicy>;
  }

  async deleteCachePolicy(id: string): Promise<void> {
    await this.prisma.aiCachePolicy.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async createCacheMetrics(data: Partial<IAiCacheMetrics>): Promise<IAiCacheMetrics> {
    return this.prisma.aiCacheMetrics.create({ data: data as any }) as Promise<IAiCacheMetrics>;
  }

  async getCacheSavings(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ICacheSavings> {
    const where: any = { workspaceId };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const [hits, misses, savings] = await Promise.all([
      this.prisma.aiCacheMetrics.count({
        where: { ...where, eventType: AiCacheEventType.HIT },
      }),
      this.prisma.aiCacheMetrics.count({
        where: { ...where, eventType: AiCacheEventType.MISS },
      }),
      this.prisma.aiCacheMetrics.aggregate({
        where: { ...where, eventType: AiCacheEventType.HIT },
        _sum: {
          tokensSaved: true,
          costSaved: true,
          latencySavedMs: true,
        },
      }),
    ]);

    const totalHits = hits;
    const totalMisses = misses;
    const total = totalHits + totalMisses;
    const hitRate = total > 0 ? totalHits / total : 0;

    const tokensSaved = savings._sum.tokensSaved || 0;
    const costSaved = savings._sum.costSaved || 0;
    const latencySavedMs = savings._sum.latencySavedMs || 0;
    const averageLatencySavedMs = totalHits > 0 ? latencySavedMs / totalHits : 0;

    return {
      totalHits,
      totalMisses,
      hitRate,
      tokensSaved,
      costSaved,
      latencySavedMs,
      averageLatencySavedMs,
    };
  }

  async createCacheInvalidation(
    data: Partial<IAiCacheInvalidation>,
  ): Promise<IAiCacheInvalidation> {
    return this.prisma.aiCacheInvalidation.create({
      data: data as any,
    }) as Promise<IAiCacheInvalidation>;
  }

  async invalidateCacheEntries(filters: {
    workspaceId: string;
    scope?: AiCacheScope;
    capability?: string;
    useCase?: string;
    provider?: string;
    model?: string;
    promptVersion?: string;
    userId?: string;
    workflowId?: string;
  }): Promise<number> {
    const where: any = {
      workspaceId: filters.workspaceId,
      status: { not: AiCacheStatus.INVALIDATED },
    };

    if (filters.scope) where.scope = filters.scope;
    if (filters.capability) where.capability = filters.capability;
    if (filters.useCase) where.useCase = filters.useCase;
    if (filters.provider) where.provider = filters.provider;
    if (filters.model) where.model = filters.model;
    if (filters.promptVersion) where.promptVersion = filters.promptVersion;
    if (filters.userId) where.userId = filters.userId;
    if (filters.workflowId) where.workflowId = filters.workflowId;

    const result = await this.prisma.aiCacheEntry.updateMany({
      where,
      data: {
        status: AiCacheStatus.INVALIDATED,
        invalidatedAt: new Date(),
      },
    });

    return result.count;
  }

  async evictExpiredCacheEntries(workspaceId: string): Promise<number> {
    const now = new Date();
    const result = await this.prisma.aiCacheEntry.updateMany({
      where: {
        workspaceId,
        expiresAt: { lte: now },
        status: { not: AiCacheStatus.INVALIDATED },
      },
      data: {
        status: AiCacheStatus.EXPIRED,
      },
    });

    return result.count;
  }

  async markStaleEntries(workspaceId: string): Promise<number> {
    const now = new Date();
    const result = await this.prisma.aiCacheEntry.updateMany({
      where: {
        workspaceId,
        staleAt: { lte: now },
        status: AiCacheStatus.VALID,
      },
      data: {
        status: AiCacheStatus.STALE,
      },
    });

    return result.count;
  }

  async findEntriesForWarmup(
    workspaceId: string,
    limit: number = 100,
  ): Promise<IAiCacheEntry[]> {
    return this.prisma.aiCacheEntry.findMany({
      where: {
        workspaceId,
        status: AiCacheStatus.STALE,
      },
      orderBy: { hitCount: 'desc' },
      take: limit,
    }) as Promise<IAiCacheEntry[]>;
  }
}
