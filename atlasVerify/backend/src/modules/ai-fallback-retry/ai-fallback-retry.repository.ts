import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  IAiRetryPolicy,
  IAiRetryExecution,
  IAiRetryAttempt,
  IAiFallbackConfig,
  IAiFallbackExecution,
} from './interfaces';
import { RetryExecutionFilterDto } from './dto';

@Injectable()
export class AiFallbackRetryRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async createRetryPolicy(
    data: Partial<IAiRetryPolicy>,
  ): Promise<IAiRetryPolicy> {
    return this.prisma.aiRetryPolicy.create({
      data: data as any,
    }) as Promise<IAiRetryPolicy>;
  }

  async updateRetryPolicy(
    id: string,
    data: Partial<IAiRetryPolicy>,
  ): Promise<IAiRetryPolicy> {
    return this.prisma.aiRetryPolicy.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiRetryPolicy>;
  }

  async findRetryPolicyById(id: string): Promise<IAiRetryPolicy | null> {
    return this.prisma.aiRetryPolicy.findFirst({
      where: { id, deletedAt: null },
    }) as Promise<IAiRetryPolicy | null>;
  }

  async findRetryPolicyByName(
    name: string,
    workspaceId?: string,
  ): Promise<IAiRetryPolicy | null> {
    return this.prisma.aiRetryPolicy.findFirst({
      where: {
        name,
        workspaceId: workspaceId || null,
        deletedAt: null,
      },
    }) as Promise<IAiRetryPolicy | null>;
  }

  async findApplicableRetryPolicies(params: {
    workspaceId?: string;
    capability: string;
    useCase?: string;
    modelProvider?: string;
  }): Promise<IAiRetryPolicy[]> {
    const where: any = {
      enabled: true,
      deletedAt: null,
      OR: [{ workspaceId: null }, { workspaceId: params.workspaceId }],
    };

    if (params.capability) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [{ capability: params.capability }, { capability: null }],
        },
      ];
    }

    if (params.useCase) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [{ useCase: params.useCase }, { useCase: null }],
        },
      ];
    }

    if (params.modelProvider) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { modelProvider: params.modelProvider },
            { modelProvider: null },
          ],
        },
      ];
    }

    return this.prisma.aiRetryPolicy.findMany({
      where,
      orderBy: { priority: 'desc' },
    }) as Promise<IAiRetryPolicy[]>;
  }

  async deleteRetryPolicy(id: string): Promise<void> {
    await this.prisma.aiRetryPolicy.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async createRetryExecution(
    data: Partial<IAiRetryExecution>,
  ): Promise<IAiRetryExecution> {
    return this.prisma.aiRetryExecution.create({
      data: data as any,
    }) as Promise<IAiRetryExecution>;
  }

  async updateRetryExecution(
    id: string,
    data: Partial<IAiRetryExecution>,
  ): Promise<IAiRetryExecution> {
    return this.prisma.aiRetryExecution.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiRetryExecution>;
  }

  async findRetryExecutionById(
    id: string,
    workspaceId: string,
  ): Promise<IAiRetryExecution | null> {
    return this.prisma.aiRetryExecution.findFirst({
      where: { id, workspaceId },
    }) as Promise<IAiRetryExecution | null>;
  }

  async findRetryExecutionByIdempotencyKey(
    idempotencyKey: string,
    workspaceId: string,
  ): Promise<IAiRetryExecution | null> {
    return this.prisma.aiRetryExecution.findFirst({
      where: { idempotencyKey, workspaceId },
    }) as Promise<IAiRetryExecution | null>;
  }

  async findAllRetryExecutions(
    filter: RetryExecutionFilterDto,
  ): Promise<[IAiRetryExecution[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { workspaceId: filter.workspaceId };

    if (filter.status) where.status = filter.status;
    if (filter.capability) where.capability = filter.capability;
    if (filter.originalProvider)
      where.originalProvider = filter.originalProvider;
    if (filter.orchestratorRequestId) {
      where.orchestratorRequestId = filter.orchestratorRequestId;
    }
    if (filter.agentExecutionId) {
      where.agentExecutionId = filter.agentExecutionId;
    }
    if (filter.workflowExecutionId) {
      where.workflowExecutionId = filter.workflowExecutionId;
    }

    const [data, total] = await Promise.all([
      this.prisma.aiRetryExecution.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aiRetryExecution.count({ where }),
    ]);

    return [data as IAiRetryExecution[], total];
  }

  async createRetryAttempt(
    data: Partial<IAiRetryAttempt>,
  ): Promise<IAiRetryAttempt> {
    return this.prisma.aiRetryAttempt.create({
      data: data as any,
    }) as Promise<IAiRetryAttempt>;
  }

  async findAttemptsByRetryExecutionId(
    retryExecutionId: string,
  ): Promise<IAiRetryAttempt[]> {
    return this.prisma.aiRetryAttempt.findMany({
      where: { retryExecutionId },
      orderBy: { attemptNumber: 'asc' },
    }) as Promise<IAiRetryAttempt[]>;
  }

  async createFallbackConfig(
    data: Partial<IAiFallbackConfig>,
  ): Promise<IAiFallbackConfig> {
    return this.prisma.aiFallbackConfig.create({
      data: data as any,
    }) as Promise<IAiFallbackConfig>;
  }

  async updateFallbackConfig(
    id: string,
    data: Partial<IAiFallbackConfig>,
  ): Promise<IAiFallbackConfig> {
    return this.prisma.aiFallbackConfig.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiFallbackConfig>;
  }

  async findFallbackConfigById(
    id: string,
  ): Promise<IAiFallbackConfig | null> {
    return this.prisma.aiFallbackConfig.findFirst({
      where: { id, deletedAt: null },
    }) as Promise<IAiFallbackConfig | null>;
  }

  async findFallbackConfigByName(
    name: string,
    workspaceId?: string,
  ): Promise<IAiFallbackConfig | null> {
    return this.prisma.aiFallbackConfig.findFirst({
      where: {
        name,
        workspaceId: workspaceId || null,
        deletedAt: null,
      },
    }) as Promise<IAiFallbackConfig | null>;
  }

  async findApplicableFallbackConfigs(params: {
    workspaceId?: string;
    capability: string;
    useCase?: string;
    sourceProvider?: string;
    failureType?: string;
  }): Promise<IAiFallbackConfig[]> {
    const where: any = {
      enabled: true,
      deletedAt: null,
      capability: params.capability,
      OR: [{ workspaceId: null }, { workspaceId: params.workspaceId }],
    };

    if (params.useCase) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [{ useCase: params.useCase }, { useCase: null }],
        },
      ];
    }

    if (params.sourceProvider) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { sourceProvider: params.sourceProvider },
            { sourceProvider: null },
          ],
        },
      ];
    }

    const configs = (await this.prisma.aiFallbackConfig.findMany({
      where,
      orderBy: { priority: 'desc' },
    })) as IAiFallbackConfig[];

    if (params.failureType) {
      return configs.filter(
        (c) =>
          c.triggerFailureTypes.length === 0 ||
          c.triggerFailureTypes.includes(params.failureType!),
      );
    }

    return configs;
  }

  async deleteFallbackConfig(id: string): Promise<void> {
    await this.prisma.aiFallbackConfig.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async createFallbackExecution(
    data: Partial<IAiFallbackExecution>,
  ): Promise<IAiFallbackExecution> {
    return this.prisma.aiFallbackExecution.create({
      data: data as any,
    }) as Promise<IAiFallbackExecution>;
  }

  async findFallbacksByRetryExecutionId(
    retryExecutionId: string,
  ): Promise<IAiFallbackExecution[]> {
    return this.prisma.aiFallbackExecution.findMany({
      where: { retryExecutionId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<IAiFallbackExecution[]>;
  }

  async getRetryStats(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    const where: any = { workspaceId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [totalExecutions, succeededExecutions, exhaustedExecutions, stats] =
      await Promise.all([
        this.prisma.aiRetryExecution.count({ where }),
        this.prisma.aiRetryExecution.count({
          where: { ...where, status: 'SUCCEEDED' },
        }),
        this.prisma.aiRetryExecution.count({
          where: { ...where, status: 'EXHAUSTED' },
        }),
        this.prisma.aiRetryExecution.aggregate({
          where,
          _avg: {
            currentAttempt: true,
            totalTokensUsed: true,
            totalCost: true,
            totalDuration: true,
          },
        }),
      ]);

    return {
      totalExecutions,
      succeededExecutions,
      exhaustedExecutions,
      successRate:
        totalExecutions > 0 ? succeededExecutions / totalExecutions : 0,
      avgAttempts: stats._avg.currentAttempt || 0,
      avgTokensUsed: stats._avg.totalTokensUsed || 0,
      avgCost: stats._avg.totalCost || 0,
      avgDuration: stats._avg.totalDuration || 0,
    };
  }
}
