import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  IAiPrompt,
  IAiPromptVersion,
  IAiPromptUsage,
  IPromptResolutionCriteria,
  AiPromptStatus,
} from './interfaces';
import { AiPromptFilterDto } from './dto';

@Injectable()
export class AiPromptRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async createPrompt(data: Partial<IAiPrompt>): Promise<IAiPrompt> {
    return this.prisma.aiPrompt.create({
      data: data as any,
    }) as Promise<IAiPrompt>;
  }

  async updatePrompt(id: string, data: Partial<IAiPrompt>): Promise<IAiPrompt> {
    return this.prisma.aiPrompt.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiPrompt>;
  }

  async findPromptById(
    id: string,
    workspaceId?: string,
  ): Promise<IAiPrompt | null> {
    const where: any = { id, deletedAt: null };

    if (workspaceId !== undefined) {
      where.OR = [{ workspaceId }, { workspaceId: null }];
    }

    return this.prisma.aiPrompt.findFirst({
      where,
    }) as Promise<IAiPrompt | null>;
  }

  async findPromptByKey(
    key: string,
    workspaceId?: string,
    version?: number,
  ): Promise<IAiPrompt | null> {
    const where: any = {
      key,
      deletedAt: null,
    };

    if (workspaceId !== undefined) {
      where.workspaceId = workspaceId;
    }

    if (version !== undefined) {
      where.version = version;
    }

    return this.prisma.aiPrompt.findFirst({
      where,
      orderBy: { version: 'desc' },
    }) as Promise<IAiPrompt | null>;
  }

  async findAllPrompts(
    filter: AiPromptFilterDto,
  ): Promise<[IAiPrompt[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (filter.workspaceId !== undefined) {
      where.OR = [
        { workspaceId: filter.workspaceId },
        { workspaceId: null },
      ];
    }

    if (filter.key) where.key = filter.key;
    if (filter.type) where.type = filter.type;
    if (filter.useCase) where.useCase = filter.useCase;
    if (filter.capability) where.capability = filter.capability;
    if (filter.agentId) where.agentId = filter.agentId;
    if (filter.status) where.status = filter.status;
    if (filter.locale) where.locale = filter.locale;
    if (filter.tag) {
      where.tags = { has: filter.tag };
    }

    const [data, total] = await Promise.all([
      this.prisma.aiPrompt.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ key: 'asc' }, { version: 'desc' }],
      }),
      this.prisma.aiPrompt.count({ where }),
    ]);

    return [data as IAiPrompt[], total];
  }

  async deletePrompt(id: string): Promise<void> {
    await this.prisma.aiPrompt.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async resolvePrompt(
    criteria: IPromptResolutionCriteria,
  ): Promise<IAiPrompt | null> {
    const where: any = {
      status: AiPromptStatus.ACTIVE,
      deletedAt: null,
    };

    if (criteria.key) where.key = criteria.key;
    if (criteria.useCase) where.useCase = criteria.useCase;
    if (criteria.capability) where.capability = criteria.capability;
    if (criteria.agentId) where.agentId = criteria.agentId;
    if (criteria.locale) where.locale = criteria.locale;

    if (criteria.effectiveDate) {
      where.OR = [
        {
          effectiveFrom: { lte: criteria.effectiveDate },
          effectiveUntil: { gte: criteria.effectiveDate },
        },
        {
          effectiveFrom: { lte: criteria.effectiveDate },
          effectiveUntil: null,
        },
        {
          effectiveFrom: null,
          effectiveUntil: null,
        },
      ];
    }

    if (criteria.workspaceId) {
      const workspacePrompt = await this.prisma.aiPrompt.findFirst({
        where: { ...where, workspaceId: criteria.workspaceId },
        orderBy: { version: 'desc' },
      });

      if (workspacePrompt) {
        return workspacePrompt as IAiPrompt;
      }
    }

    return this.prisma.aiPrompt.findFirst({
      where: { ...where, workspaceId: null },
      orderBy: { version: 'desc' },
    }) as Promise<IAiPrompt | null>;
  }

  async createVersion(
    data: Partial<IAiPromptVersion>,
  ): Promise<IAiPromptVersion> {
    return this.prisma.aiPromptVersion.create({
      data: data as any,
    }) as Promise<IAiPromptVersion>;
  }

  async findVersionsByPromptId(promptId: string): Promise<IAiPromptVersion[]> {
    return this.prisma.aiPromptVersion.findMany({
      where: { promptId },
      orderBy: { version: 'desc' },
    }) as Promise<IAiPromptVersion[]>;
  }

  async findVersionByNumber(
    promptId: string,
    version: number,
  ): Promise<IAiPromptVersion | null> {
    return this.prisma.aiPromptVersion.findFirst({
      where: { promptId, version },
    }) as Promise<IAiPromptVersion | null>;
  }

  async getLatestVersionNumber(promptId: string): Promise<number> {
    const latest = await this.prisma.aiPromptVersion.findFirst({
      where: { promptId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    return latest?.version || 0;
  }

  async trackUsage(data: Partial<IAiPromptUsage>): Promise<IAiPromptUsage> {
    return this.prisma.aiPromptUsage.create({
      data: data as any,
    }) as Promise<IAiPromptUsage>;
  }

  async incrementUsageCount(promptId: string): Promise<void> {
    await this.prisma.aiPrompt.update({
      where: { id: promptId },
      data: {
        usageCount: { increment: 1 },
      },
    });
  }

  async incrementFailureCount(promptId: string): Promise<void> {
    await this.prisma.aiPrompt.update({
      where: { id: promptId },
      data: {
        failureCount: { increment: 1 },
      },
    });
  }

  async updateQualityScore(promptId: string, score: number): Promise<void> {
    await this.prisma.aiPrompt.update({
      where: { id: promptId },
      data: { qualityScore: score },
    });
  }

  async getCachedPrompt(cacheKey: string): Promise<Record<string, unknown> | null> {
    const cached = await this.prisma.aiPromptCache.findFirst({
      where: {
        cacheKey,
        expiresAt: { gt: new Date() },
      },
    });

    return cached ? (cached.promptData as Record<string, unknown>) : null;
  }

  async setCachedPrompt(
    workspaceId: string | null,
    cacheKey: string,
    promptData: Record<string, unknown>,
    ttlMinutes: number,
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);

    await this.prisma.aiPromptCache.upsert({
      where: { cacheKey },
      create: {
        workspaceId,
        cacheKey,
        promptData,
        expiresAt,
      },
      update: {
        promptData,
        expiresAt,
        updatedAt: new Date(),
      },
    });
  }

  async invalidateCache(pattern?: string): Promise<number> {
    const where: any = {};

    if (pattern) {
      where.cacheKey = { contains: pattern };
    }

    const result = await this.prisma.aiPromptCache.deleteMany({ where });
    return result.count;
  }

  async getPromptStats(
    promptId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalUsage: number;
    successCount: number;
    failureCount: number;
    averageTokens: number;
    totalCost: number;
  }> {
    const where: any = { promptId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [totalUsage, successCount, failureCount, stats] = await Promise.all([
      this.prisma.aiPromptUsage.count({ where }),
      this.prisma.aiPromptUsage.count({ where: { ...where, success: true } }),
      this.prisma.aiPromptUsage.count({ where: { ...where, success: false } }),
      this.prisma.aiPromptUsage.aggregate({
        where,
        _sum: {
          inputTokens: true,
          outputTokens: true,
          cost: true,
        },
      }),
    ]);

    const totalTokens = (stats._sum.inputTokens || 0) + (stats._sum.outputTokens || 0);

    return {
      totalUsage,
      successCount,
      failureCount,
      averageTokens: totalUsage > 0 ? totalTokens / totalUsage : 0,
      totalCost: stats._sum.cost || 0,
    };
  }
}
