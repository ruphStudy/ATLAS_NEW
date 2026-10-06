import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  IAiContext,
  IAiContextVersion,
  IAiContextCache,
  IAiContextEventRecord,
  AiContextStatus,
} from './interfaces';
import { ContextFilterDto, ResolveContextDto } from './dto';

@Injectable()
export class AiContextManagementRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async createContext(data: Partial<IAiContext>): Promise<IAiContext> {
    return this.prisma.aiContext.create({
      data: data as any,
    }) as Promise<IAiContext>;
  }

  async updateContext(id: string, data: Partial<IAiContext>): Promise<IAiContext> {
    return this.prisma.aiContext.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiContext>;
  }

  async findContextById(
    id: string,
    workspaceId: string,
  ): Promise<IAiContext | null> {
    return this.prisma.aiContext.findFirst({
      where: { id, workspaceId, deletedAt: null },
    }) as Promise<IAiContext | null>;
  }

  async findContextByCorrelationId(
    correlationId: string,
    workspaceId: string,
  ): Promise<IAiContext | null> {
    return this.prisma.aiContext.findFirst({
      where: { correlationId, workspaceId, deletedAt: null },
    }) as Promise<IAiContext | null>;
  }

  async resolveContext(params: ResolveContextDto): Promise<IAiContext | null> {
    const where: any = {
      workspaceId: params.workspaceId,
      status: AiContextStatus.ACTIVE,
      deletedAt: null,
    };

    if (params.correlationId) {
      where.correlationId = params.correlationId;
    } else {
      if (params.workflowExecutionId) {
        where.workflowExecutionId = params.workflowExecutionId;
      }
      if (params.agentExecutionId) {
        where.agentExecutionId = params.agentExecutionId;
      }
      if (params.taskId) {
        where.taskId = params.taskId;
      }
      if (params.sessionId) {
        where.sessionId = params.sessionId;
      }
      if (params.userId) {
        where.userId = params.userId;
      }
    }

    return this.prisma.aiContext.findFirst({
      where,
      orderBy: { lastAccessedAt: 'desc' },
    }) as Promise<IAiContext | null>;
  }

  async findAllContexts(
    filter: ContextFilterDto,
  ): Promise<[IAiContext[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {
      workspaceId: filter.workspaceId,
      deletedAt: null,
    };

    if (filter.type) where.type = filter.type;
    if (filter.status) where.status = filter.status;
    if (filter.priority) where.priority = filter.priority;
    if (filter.correlationId) where.correlationId = filter.correlationId;
    if (filter.userId) where.userId = filter.userId;
    if (filter.sessionId) where.sessionId = filter.sessionId;
    if (filter.workflowExecutionId) {
      where.workflowExecutionId = filter.workflowExecutionId;
    }
    if (filter.agentExecutionId) {
      where.agentExecutionId = filter.agentExecutionId;
    }
    if (filter.taskId) where.taskId = filter.taskId;
    if (filter.tag) {
      where.tags = { has: filter.tag };
    }

    const [data, total] = await Promise.all([
      this.prisma.aiContext.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.aiContext.count({ where }),
    ]);

    return [data as IAiContext[], total];
  }

  async deleteContext(id: string): Promise<void> {
    await this.prisma.aiContext.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async createVersion(
    data: Partial<IAiContextVersion>,
  ): Promise<IAiContextVersion> {
    return this.prisma.aiContextVersion.create({
      data: data as any,
    }) as Promise<IAiContextVersion>;
  }

  async findVersionsByContextId(contextId: string): Promise<IAiContextVersion[]> {
    return this.prisma.aiContextVersion.findMany({
      where: { contextId },
      orderBy: { version: 'desc' },
    }) as Promise<IAiContextVersion[]>;
  }

  async findVersionByContextAndVersion(
    contextId: string,
    version: number,
  ): Promise<IAiContextVersion | null> {
    return this.prisma.aiContextVersion.findFirst({
      where: { contextId, version },
    }) as Promise<IAiContextVersion | null>;
  }

  async createCacheEntry(
    data: Partial<IAiContextCache>,
  ): Promise<IAiContextCache> {
    return this.prisma.aiContextCache.create({
      data: data as any,
    }) as Promise<IAiContextCache>;
  }

  async findCacheByCacheKey(cacheKey: string): Promise<IAiContextCache | null> {
    return this.prisma.aiContextCache.findFirst({
      where: {
        cacheKey,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    }) as Promise<IAiContextCache | null>;
  }

  async updateCacheHit(id: string): Promise<void> {
    await this.prisma.aiContextCache.update({
      where: { id },
      data: {
        hits: { increment: 1 },
        lastHitAt: new Date(),
      },
    });
  }

  async invalidateCache(contextId: string): Promise<void> {
    await this.prisma.aiContextCache.deleteMany({
      where: { contextId },
    });
  }

  async invalidateCacheByKey(cacheKey: string): Promise<void> {
    await this.prisma.aiContextCache.delete({
      where: { cacheKey },
    });
  }

  async cleanupExpiredCache(): Promise<number> {
    const result = await this.prisma.aiContextCache.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    return result.count;
  }

  async createEvent(
    data: Partial<IAiContextEventRecord>,
  ): Promise<IAiContextEventRecord> {
    return this.prisma.aiContextEvent.create({
      data: data as any,
    }) as Promise<IAiContextEventRecord>;
  }

  async findEventsByContextId(
    contextId: string,
  ): Promise<IAiContextEventRecord[]> {
    return this.prisma.aiContextEvent.findMany({
      where: { contextId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }) as Promise<IAiContextEventRecord[]>;
  }

  async expireOldContexts(maxAge: number): Promise<number> {
    const cutoffDate = new Date(Date.now() - maxAge);

    const result = await this.prisma.aiContext.updateMany({
      where: {
        status: AiContextStatus.ACTIVE,
        expiresAt: { lt: cutoffDate },
      },
      data: {
        status: AiContextStatus.EXPIRED,
      },
    });

    return result.count;
  }

  async archiveExpiredContexts(): Promise<number> {
    const result = await this.prisma.aiContext.updateMany({
      where: {
        status: AiContextStatus.EXPIRED,
      },
      data: {
        status: AiContextStatus.ARCHIVED,
      },
    });

    return result.count;
  }

  async updateLastAccessed(id: string): Promise<void> {
    await this.prisma.aiContext.update({
      where: { id },
      data: { lastAccessedAt: new Date() },
    });
  }

  async getContextStats(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    const where: any = { workspaceId, deletedAt: null };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [totalContexts, activeContexts, stats] = await Promise.all([
      this.prisma.aiContext.count({ where }),
      this.prisma.aiContext.count({
        where: { ...where, status: AiContextStatus.ACTIVE },
      }),
      this.prisma.aiContext.aggregate({
        where,
        _sum: {
          sizeBytes: true,
          tokenEstimate: true,
        },
        _avg: {
          tokenEstimate: true,
          version: true,
        },
      }),
    ]);

    return {
      totalContexts,
      activeContexts,
      totalSizeBytes: stats._sum.sizeBytes || 0,
      totalTokens: stats._sum.tokenEstimate || 0,
      avgTokens: stats._avg.tokenEstimate || 0,
      avgVersion: stats._avg.version || 0,
    };
  }
}
