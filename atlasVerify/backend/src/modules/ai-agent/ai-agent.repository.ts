import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  IAiAgent,
  IAiAgentConfiguration,
  IAiAgentExecution,
  IAiAgentContext,
  IAiAgentWorkflow,
} from './interfaces';
import { AiAgentFilterDto, ExecutionFilterDto } from './dto';

@Injectable()
export class AiAgentRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async createAgent(data: Partial<IAiAgent>): Promise<IAiAgent> {
    return this.prisma.aiAgent.create({
      data: data as any,
    }) as Promise<IAiAgent>;
  }

  async updateAgent(id: string, data: Partial<IAiAgent>): Promise<IAiAgent> {
    return this.prisma.aiAgent.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiAgent>;
  }

  async findAgentById(
    id: string,
    workspaceId?: string,
  ): Promise<IAiAgent | null> {
    const where: any = { id, deletedAt: null };
    
    if (workspaceId !== undefined) {
      where.OR = [
        { workspaceId },
        { workspaceId: null, isPublic: true },
      ];
    }

    return this.prisma.aiAgent.findFirst({
      where,
    }) as Promise<IAiAgent | null>;
  }

  async findAgentByKey(
    key: string,
    workspaceId?: string,
  ): Promise<IAiAgent | null> {
    return this.prisma.aiAgent.findFirst({
      where: {
        key,
        workspaceId: workspaceId || null,
        deletedAt: null,
      },
    }) as Promise<IAiAgent | null>;
  }

  async findAllAgents(
    filter: AiAgentFilterDto,
  ): Promise<[IAiAgent[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (filter.workspaceId !== undefined) {
      where.OR = [
        { workspaceId: filter.workspaceId },
        { workspaceId: null, isPublic: true },
      ];
    }

    if (filter.type) where.type = filter.type;
    if (filter.status) where.status = filter.status;
    if (filter.capability) {
      where.capabilities = { has: filter.capability };
    }
    if (filter.tag) {
      where.tags = { has: filter.tag };
    }

    const [data, total] = await Promise.all([
      this.prisma.aiAgent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aiAgent.count({ where }),
    ]);

    return [data as IAiAgent[], total];
  }

  async deleteAgent(id: string): Promise<void> {
    await this.prisma.aiAgent.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async createConfiguration(
    data: Partial<IAiAgentConfiguration>,
  ): Promise<IAiAgentConfiguration> {
    return this.prisma.aiAgentConfiguration.create({
      data: data as any,
    }) as Promise<IAiAgentConfiguration>;
  }

  async updateConfiguration(
    id: string,
    workspaceId: string,
    data: Partial<IAiAgentConfiguration>,
  ): Promise<IAiAgentConfiguration> {
    return this.prisma.aiAgentConfiguration.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiAgentConfiguration>;
  }

  async findConfigurationById(
    id: string,
    workspaceId: string,
  ): Promise<IAiAgentConfiguration | null> {
    return this.prisma.aiAgentConfiguration.findFirst({
      where: { id, workspaceId, deletedAt: null },
    }) as Promise<IAiAgentConfiguration | null>;
  }

  async findConfigurationByUseCase(
    agentId: string,
    useCase: string,
    workspaceId: string,
  ): Promise<IAiAgentConfiguration | null> {
    return this.prisma.aiAgentConfiguration.findFirst({
      where: {
        agentId,
        useCase,
        workspaceId,
        enabled: true,
        deletedAt: null,
      },
      orderBy: { priority: 'desc' },
    }) as Promise<IAiAgentConfiguration | null>;
  }

  async deleteConfiguration(id: string, workspaceId: string): Promise<void> {
    await this.prisma.aiAgentConfiguration.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async createExecution(
    data: Partial<IAiAgentExecution>,
  ): Promise<IAiAgentExecution> {
    return this.prisma.aiAgentExecution.create({
      data: data as any,
    }) as Promise<IAiAgentExecution>;
  }

  async updateExecution(
    id: string,
    data: Partial<IAiAgentExecution>,
  ): Promise<IAiAgentExecution> {
    return this.prisma.aiAgentExecution.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiAgentExecution>;
  }

  async findExecutionById(id: string): Promise<IAiAgentExecution | null> {
    return this.prisma.aiAgentExecution.findUnique({
      where: { id },
      include: {
        contextSnapshots: {
          orderBy: { turnNumber: 'asc' },
        },
      },
    }) as Promise<IAiAgentExecution | null>;
  }

  async findAllExecutions(
    filter: ExecutionFilterDto,
  ): Promise<[IAiAgentExecution[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filter.workspaceId) where.workspaceId = filter.workspaceId;
    if (filter.agentId) where.agentId = filter.agentId;
    if (filter.sessionId) where.sessionId = filter.sessionId;
    if (filter.status) where.status = filter.status;
    if (filter.userId) where.userId = filter.userId;

    const [data, total] = await Promise.all([
      this.prisma.aiAgentExecution.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aiAgentExecution.count({ where }),
    ]);

    return [data as IAiAgentExecution[], total];
  }

  async createContext(
    data: Partial<IAiAgentContext>,
  ): Promise<IAiAgentContext> {
    return this.prisma.aiAgentContext.create({
      data: data as any,
    }) as Promise<IAiAgentContext>;
  }

  async findContextByExecutionId(
    executionId: string,
  ): Promise<IAiAgentContext[]> {
    return this.prisma.aiAgentContext.findMany({
      where: { executionId },
      orderBy: { turnNumber: 'asc' },
    }) as Promise<IAiAgentContext[]>;
  }

  async createWorkflow(
    data: Partial<IAiAgentWorkflow>,
  ): Promise<IAiAgentWorkflow> {
    return this.prisma.aiAgentWorkflow.create({
      data: data as any,
    }) as Promise<IAiAgentWorkflow>;
  }

  async findWorkflowById(
    id: string,
    workspaceId: string,
  ): Promise<IAiAgentWorkflow | null> {
    return this.prisma.aiAgentWorkflow.findFirst({
      where: { id, workspaceId, deletedAt: null },
    }) as Promise<IAiAgentWorkflow | null>;
  }

  async deleteWorkflow(id: string): Promise<void> {
    await this.prisma.aiAgentWorkflow.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getAgentStats(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalExecutions: number;
    completedExecutions: number;
    failedExecutions: number;
    totalCost: number;
    totalTokens: number;
    averageTurns: number;
  }> {
    const where: any = { workspaceId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [totalExecutions, completedExecutions, failedExecutions, stats] =
      await Promise.all([
        this.prisma.aiAgentExecution.count({ where }),
        this.prisma.aiAgentExecution.count({
          where: { ...where, status: 'COMPLETED' },
        }),
        this.prisma.aiAgentExecution.count({
          where: { ...where, status: 'FAILED' },
        }),
        this.prisma.aiAgentExecution.aggregate({
          where,
          _sum: {
            totalCost: true,
            totalTokens: true,
          },
          _avg: {
            turns: true,
          },
        }),
      ]);

    return {
      totalExecutions,
      completedExecutions,
      failedExecutions,
      totalCost: stats._sum.totalCost || 0,
      totalTokens: stats._sum.totalTokens || 0,
      averageTurns: stats._avg.turns || 0,
    };
  }
}
