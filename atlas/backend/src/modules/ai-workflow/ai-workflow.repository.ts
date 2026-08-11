import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  IAiWorkflow,
  IAiWorkflowExecution,
  IAiWorkflowStepExecution,
  IAiWorkflowSchedule,
  AiWorkflowStatus,
} from './interfaces';
import { AiWorkflowFilterDto, ExecutionFilterDto } from './dto';

@Injectable()
export class AiWorkflowRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async createWorkflow(data: Partial<IAiWorkflow>): Promise<IAiWorkflow> {
    return this.prisma.aiWorkflow.create({
      data: data as any,
    }) as Promise<IAiWorkflow>;
  }

  async updateWorkflow(id: string, data: Partial<IAiWorkflow>): Promise<IAiWorkflow> {
    return this.prisma.aiWorkflow.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiWorkflow>;
  }

  async findWorkflowById(
    id: string,
    workspaceId: string,
  ): Promise<IAiWorkflow | null> {
    return this.prisma.aiWorkflow.findFirst({
      where: { id, workspaceId, deletedAt: null },
    }) as Promise<IAiWorkflow | null>;
  }

  async findWorkflowByKey(
    key: string,
    workspaceId: string,
    version?: number,
  ): Promise<IAiWorkflow | null> {
    const where: any = {
      key,
      workspaceId,
      deletedAt: null,
    };

    if (version !== undefined) {
      where.version = version;
    }

    return this.prisma.aiWorkflow.findFirst({
      where,
      orderBy: { version: 'desc' },
    }) as Promise<IAiWorkflow | null>;
  }

  async findAllWorkflows(
    filter: AiWorkflowFilterDto,
  ): Promise<[IAiWorkflow[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (filter.workspaceId) where.workspaceId = filter.workspaceId;
    if (filter.key) where.key = filter.key;
    if (filter.status) where.status = filter.status;
    if (filter.triggerType) where.triggerType = filter.triggerType;
    if (filter.tag) {
      where.tags = { has: filter.tag };
    }

    const [data, total] = await Promise.all([
      this.prisma.aiWorkflow.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ key: 'asc' }, { version: 'desc' }],
      }),
      this.prisma.aiWorkflow.count({ where }),
    ]);

    return [data as IAiWorkflow[], total];
  }

  async deleteWorkflow(id: string): Promise<void> {
    await this.prisma.aiWorkflow.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async createExecution(
    data: Partial<IAiWorkflowExecution>,
  ): Promise<IAiWorkflowExecution> {
    return this.prisma.aiWorkflowExecution.create({
      data: data as any,
    }) as Promise<IAiWorkflowExecution>;
  }

  async updateExecution(
    id: string,
    data: Partial<IAiWorkflowExecution>,
  ): Promise<IAiWorkflowExecution> {
    return this.prisma.aiWorkflowExecution.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiWorkflowExecution>;
  }

  async findExecutionById(id: string): Promise<IAiWorkflowExecution | null> {
    return this.prisma.aiWorkflowExecution.findUnique({
      where: { id },
      include: {
        stepExecutions: {
          orderBy: { stepIndex: 'asc' },
        },
      },
    }) as Promise<IAiWorkflowExecution | null>;
  }

  async findAllExecutions(
    filter: ExecutionFilterDto,
  ): Promise<[IAiWorkflowExecution[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filter.workspaceId) where.workspaceId = filter.workspaceId;
    if (filter.workflowId) where.workflowId = filter.workflowId;
    if (filter.status) where.status = filter.status;
    if (filter.triggerType) where.triggerType = filter.triggerType;
    if (filter.triggeredBy) where.triggeredBy = filter.triggeredBy;

    const [data, total] = await Promise.all([
      this.prisma.aiWorkflowExecution.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aiWorkflowExecution.count({ where }),
    ]);

    return [data as IAiWorkflowExecution[], total];
  }

  async createStepExecution(
    data: Partial<IAiWorkflowStepExecution>,
  ): Promise<IAiWorkflowStepExecution> {
    return this.prisma.aiWorkflowStepExecution.create({
      data: data as any,
    }) as Promise<IAiWorkflowStepExecution>;
  }

  async updateStepExecution(
    id: string,
    data: Partial<IAiWorkflowStepExecution>,
  ): Promise<IAiWorkflowStepExecution> {
    return this.prisma.aiWorkflowStepExecution.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiWorkflowStepExecution>;
  }

  async findStepExecutionsByExecutionId(
    executionId: string,
  ): Promise<IAiWorkflowStepExecution[]> {
    return this.prisma.aiWorkflowStepExecution.findMany({
      where: { executionId },
      orderBy: { stepIndex: 'asc' },
    }) as Promise<IAiWorkflowStepExecution[]>;
  }

  async createSchedule(
    data: Partial<IAiWorkflowSchedule>,
  ): Promise<IAiWorkflowSchedule> {
    return this.prisma.aiWorkflowSchedule.create({
      data: data as any,
    }) as Promise<IAiWorkflowSchedule>;
  }

  async updateSchedule(
    id: string,
    data: Partial<IAiWorkflowSchedule>,
  ): Promise<IAiWorkflowSchedule> {
    return this.prisma.aiWorkflowSchedule.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiWorkflowSchedule>;
  }

  async findScheduleById(
    id: string,
    workspaceId: string,
  ): Promise<IAiWorkflowSchedule | null> {
    return this.prisma.aiWorkflowSchedule.findFirst({
      where: { id, workspaceId, deletedAt: null },
    }) as Promise<IAiWorkflowSchedule | null>;
  }

  async findSchedulesByWorkflowId(
    workflowId: string,
  ): Promise<IAiWorkflowSchedule[]> {
    return this.prisma.aiWorkflowSchedule.findMany({
      where: { workflowId, deletedAt: null },
    }) as Promise<IAiWorkflowSchedule[]>;
  }

  async deleteSchedule(id: string): Promise<void> {
    await this.prisma.aiWorkflowSchedule.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getWorkflowStats(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalExecutions: number;
    completedExecutions: number;
    failedExecutions: number;
    totalCost: number;
    totalTokens: number;
    averageDuration: number;
  }> {
    const where: any = { workspaceId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [totalExecutions, completedExecutions, failedExecutions, stats] =
      await Promise.all([
        this.prisma.aiWorkflowExecution.count({ where }),
        this.prisma.aiWorkflowExecution.count({
          where: { ...where, status: 'COMPLETED' },
        }),
        this.prisma.aiWorkflowExecution.count({
          where: { ...where, status: 'FAILED' },
        }),
        this.prisma.aiWorkflowExecution.aggregate({
          where,
          _sum: {
            totalCost: true,
            totalTokens: true,
          },
        }),
      ]);

    const executions = await this.prisma.aiWorkflowExecution.findMany({
      where: {
        ...where,
        endTime: { not: null },
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    let totalDuration = 0;
    executions.forEach((exec) => {
      if (exec.endTime) {
        totalDuration +=
          new Date(exec.endTime).getTime() -
          new Date(exec.startTime).getTime();
      }
    });

    const averageDuration =
      executions.length > 0 ? totalDuration / executions.length : 0;

    return {
      totalExecutions,
      completedExecutions,
      failedExecutions,
      totalCost: stats._sum.totalCost || 0,
      totalTokens: stats._sum.totalTokens || 0,
      averageDuration,
    };
  }
}
