import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  IAiJob,
  IAiJobExecution,
  IAiJobLog,
  IAiJobDependency,
} from './interfaces';
import { AiJobFilterDto, ExecutionFilterDto } from './dto';

@Injectable()
export class AiJobSchedulerRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async createJob(data: Partial<IAiJob>): Promise<IAiJob> {
    return this.prisma.aiJob.create({
      data: data as any,
    }) as Promise<IAiJob>;
  }

  async updateJob(id: string, data: Partial<IAiJob>): Promise<IAiJob> {
    return this.prisma.aiJob.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiJob>;
  }

  async findJobById(
    id: string,
    workspaceId: string,
  ): Promise<IAiJob | null> {
    return this.prisma.aiJob.findFirst({
      where: { id, workspaceId, deletedAt: null },
    }) as Promise<IAiJob | null>;
  }

  async findJobByKey(
    key: string,
    workspaceId: string,
  ): Promise<IAiJob | null> {
    return this.prisma.aiJob.findFirst({
      where: { key, workspaceId, deletedAt: null },
    }) as Promise<IAiJob | null>;
  }

  async findJobByIdempotencyKey(
    idempotencyKey: string,
    workspaceId: string,
  ): Promise<IAiJob | null> {
    return this.prisma.aiJob.findFirst({
      where: { idempotencyKey, workspaceId, deletedAt: null },
    }) as Promise<IAiJob | null>;
  }

  async findAllJobs(
    filter: AiJobFilterDto,
  ): Promise<[IAiJob[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (filter.workspaceId) where.workspaceId = filter.workspaceId;
    if (filter.key) where.key = filter.key;
    if (filter.type) where.type = filter.type;
    if (filter.taskType) where.taskType = filter.taskType;
    if (filter.status) where.status = filter.status;
    if (filter.priority) where.priority = filter.priority;
    if (filter.tag) {
      where.tags = { has: filter.tag };
    }

    const [data, total] = await Promise.all([
      this.prisma.aiJob.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      }),
      this.prisma.aiJob.count({ where }),
    ]);

    return [data as IAiJob[], total];
  }

  async deleteJob(id: string): Promise<void> {
    await this.prisma.aiJob.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async createExecution(
    data: Partial<IAiJobExecution>,
  ): Promise<IAiJobExecution> {
    return this.prisma.aiJobExecution.create({
      data: data as any,
    }) as Promise<IAiJobExecution>;
  }

  async updateExecution(
    id: string,
    data: Partial<IAiJobExecution>,
  ): Promise<IAiJobExecution> {
    return this.prisma.aiJobExecution.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiJobExecution>;
  }

  async findExecutionById(id: string): Promise<IAiJobExecution | null> {
    return this.prisma.aiJobExecution.findUnique({
      where: { id },
    }) as Promise<IAiJobExecution | null>;
  }

  async findAllExecutions(
    filter: ExecutionFilterDto,
  ): Promise<[IAiJobExecution[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filter.workspaceId) where.workspaceId = filter.workspaceId;
    if (filter.jobId) where.jobId = filter.jobId;
    if (filter.status) where.status = filter.status;

    const [data, total] = await Promise.all([
      this.prisma.aiJobExecution.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aiJobExecution.count({ where }),
    ]);

    return [data as IAiJobExecution[], total];
  }

  async createLog(data: Partial<IAiJobLog>): Promise<IAiJobLog> {
    return this.prisma.aiJobLog.create({
      data: data as any,
    }) as Promise<IAiJobLog>;
  }

  async findLogsByExecutionId(executionId: string): Promise<IAiJobLog[]> {
    return this.prisma.aiJobLog.findMany({
      where: { executionId },
      orderBy: { timestamp: 'asc' },
    }) as Promise<IAiJobLog[]>;
  }

  async createDependency(
    data: Partial<IAiJobDependency>,
  ): Promise<IAiJobDependency> {
    return this.prisma.aiJobDependency.create({
      data: data as any,
    }) as Promise<IAiJobDependency>;
  }

  async findDependenciesByJobId(jobId: string): Promise<IAiJobDependency[]> {
    return this.prisma.aiJobDependency.findMany({
      where: { jobId },
    }) as Promise<IAiJobDependency[]>;
  }

  async deleteDependency(id: string): Promise<void> {
    await this.prisma.aiJobDependency.delete({
      where: { id },
    });
  }

  async findJobsReadyForExecution(workspaceId: string): Promise<IAiJob[]> {
    return this.prisma.aiJob.findMany({
      where: {
        workspaceId,
        status: 'PENDING',
        deletedAt: null,
        OR: [
          { startAfter: null },
          { startAfter: { lte: new Date() } },
        ],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: 100,
    }) as Promise<IAiJob[]>;
  }

  async incrementExecutionCount(jobId: string): Promise<void> {
    await this.prisma.aiJob.update({
      where: { id: jobId },
      data: {
        executionCount: { increment: 1 },
        lastExecutedAt: new Date(),
      },
    });
  }

  async incrementSuccessCount(jobId: string): Promise<void> {
    await this.prisma.aiJob.update({
      where: { id: jobId },
      data: {
        successCount: { increment: 1 },
      },
    });
  }

  async incrementFailureCount(jobId: string): Promise<void> {
    await this.prisma.aiJob.update({
      where: { id: jobId },
      data: {
        failureCount: { increment: 1 },
      },
    });
  }

  async getJobStats(
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

    const [totalJobs, totalExecutions, stats] = await Promise.all([
      this.prisma.aiJob.count({ where: { ...where, deletedAt: null } }),
      this.prisma.aiJobExecution.count({ where }),
      this.prisma.aiJobExecution.aggregate({
        where,
        _count: {
          id: true,
        },
        _sum: {
          cost: true,
          tokens: true,
        },
      }),
    ]);

    const completedExecutions = await this.prisma.aiJobExecution.count({
      where: { ...where, status: 'COMPLETED' },
    });

    const failedExecutions = await this.prisma.aiJobExecution.count({
      where: { ...where, status: 'FAILED' },
    });

    return {
      totalJobs,
      totalExecutions,
      completedExecutions,
      failedExecutions,
      totalCost: stats._sum.cost || 0,
      totalTokens: stats._sum.tokens || 0,
    };
  }
}
