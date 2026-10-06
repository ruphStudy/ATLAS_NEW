import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  IAiRequest,
  IAiResponse,
  IAiExecutionLog,
  AiRequestStatus,
  AiExecutionMode,
} from './interfaces';
import { AiRequestFilterDto, ExecutionLogFilterDto } from './dto';

@Injectable()
export class AiOrchestratorRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async createRequest(
    data: Partial<IAiRequest>,
  ): Promise<IAiRequest> {
    return this.prisma.aiRequest.create({
      data: data as any,
    }) as Promise<IAiRequest>;
  }

  async updateRequest(
    id: string,
    data: Partial<IAiRequest>,
  ): Promise<IAiRequest> {
    return this.prisma.aiRequest.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiRequest>;
  }

  async findRequestById(
    id: string,
    workspaceId: string,
  ): Promise<IAiRequest | null> {
    return this.prisma.aiRequest.findFirst({
      where: {
        id,
        workspaceId,
        deletedAt: null,
      },
    }) as Promise<IAiRequest | null>;
  }

  async findAllRequests(
    filter: AiRequestFilterDto,
  ): Promise<[IAiRequest[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (filter.workspaceId) where.workspaceId = filter.workspaceId;
    if (filter.useCase) where.useCase = filter.useCase;
    if (filter.capability) where.capability = filter.capability;
    if (filter.provider) where.provider = filter.provider;
    if (filter.status) where.status = filter.status;
    if (filter.executionMode) where.executionMode = filter.executionMode;
    if (filter.routingStrategy) where.routingStrategy = filter.routingStrategy;
    if (filter.userId) where.userId = filter.userId;

    const [data, total] = await Promise.all([
      this.prisma.aiRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aiRequest.count({ where }),
    ]);

    return [data as IAiRequest[], total];
  }

  async cancelRequest(id: string, workspaceId: string): Promise<IAiRequest> {
    return this.prisma.aiRequest.update({
      where: { id },
      data: {
        status: AiRequestStatus.CANCELLED,
        updatedAt: new Date(),
      },
    }) as Promise<IAiRequest>;
  }

  async deleteRequest(id: string): Promise<void> {
    await this.prisma.aiRequest.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async createResponse(data: Partial<IAiResponse>): Promise<IAiResponse> {
    return this.prisma.aiResponse.create({
      data: data as any,
    }) as Promise<IAiResponse>;
  }

  async findResponsesByRequestId(requestId: string): Promise<IAiResponse[]> {
    return this.prisma.aiResponse.findMany({
      where: { requestId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<IAiResponse[]>;
  }

  async createExecutionLog(
    data: Partial<IAiExecutionLog>,
  ): Promise<IAiExecutionLog> {
    return this.prisma.aiExecutionLog.create({
      data: data as any,
    }) as Promise<IAiExecutionLog>;
  }

  async updateExecutionLog(
    id: string,
    data: Partial<IAiExecutionLog>,
  ): Promise<IAiExecutionLog> {
    return this.prisma.aiExecutionLog.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiExecutionLog>;
  }

  async findExecutionLogs(
    filter: ExecutionLogFilterDto,
  ): Promise<[IAiExecutionLog[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filter.workspaceId) where.workspaceId = filter.workspaceId;
    if (filter.requestId) where.requestId = filter.requestId;
    if (filter.provider) where.provider = filter.provider;
    if (filter.modelKey) where.modelKey = filter.modelKey;
    if (filter.capability) where.capability = filter.capability;
    if (filter.useCase) where.useCase = filter.useCase;
    if (filter.status) where.status = filter.status;

    const [data, total] = await Promise.all([
      this.prisma.aiExecutionLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aiExecutionLog.count({ where }),
    ]);

    return [data as IAiExecutionLog[], total];
  }

  async findExecutionLogsByRequestId(
    requestId: string,
  ): Promise<IAiExecutionLog[]> {
    return this.prisma.aiExecutionLog.findMany({
      where: { requestId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<IAiExecutionLog[]>;
  }

  async getCachedResult(
    workspaceId: string,
    cacheKey: string,
  ): Promise<Record<string, unknown> | null> {
    const cached = await this.prisma.aiOrchestrationCache.findFirst({
      where: {
        workspaceId,
        cacheKey,
        expiresAt: { gt: new Date() },
      },
    });

    return cached ? (cached.result as Record<string, unknown>) : null;
  }

  async setCachedResult(
    workspaceId: string,
    cacheKey: string,
    result: Record<string, unknown>,
    ttlMinutes: number,
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);

    await this.prisma.aiOrchestrationCache.upsert({
      where: {
        workspaceId_cacheKey: {
          workspaceId,
          cacheKey,
        },
      },
      create: {
        workspaceId,
        cacheKey,
        result,
        expiresAt,
      },
      update: {
        result,
        expiresAt,
        updatedAt: new Date(),
      },
    });
  }

  async invalidateCache(workspaceId: string, pattern?: string): Promise<number> {
    const where: any = { workspaceId };

    if (pattern) {
      where.cacheKey = { contains: pattern };
    }

    const result = await this.prisma.aiOrchestrationCache.deleteMany({ where });
    return result.count;
  }

  async getRequestStats(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalRequests: number;
    completedRequests: number;
    failedRequests: number;
    totalCost: number;
    totalTokens: number;
    averageLatency: number;
  }> {
    const where: any = {
      workspaceId,
      deletedAt: null,
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [totalRequests, completedRequests, failedRequests, executionStats] =
      await Promise.all([
        this.prisma.aiRequest.count({ where }),
        this.prisma.aiRequest.count({
          where: { ...where, status: AiRequestStatus.COMPLETED },
        }),
        this.prisma.aiRequest.count({
          where: { ...where, status: AiRequestStatus.FAILED },
        }),
        this.prisma.aiExecutionLog.aggregate({
          where: {
            workspaceId,
            ...(startDate || endDate
              ? {
                  createdAt: {
                    ...(startDate ? { gte: startDate } : {}),
                    ...(endDate ? { lte: endDate } : {}),
                  },
                }
              : {}),
          },
          _sum: {
            cost: true,
            totalTokens: true,
          },
          _avg: {
            latency: true,
          },
        }),
      ]);

    return {
      totalRequests,
      completedRequests,
      failedRequests,
      totalCost: executionStats._sum.cost || 0,
      totalTokens: executionStats._sum.totalTokens || 0,
      averageLatency: executionStats._avg.latency || 0,
    };
  }
}
