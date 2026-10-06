import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  IAiQueue,
  IAiQueueJob,
  IAiQueueMetrics,
  IAiQueueFailure,
  AiQueueJobStatus,
} from './interfaces';
import { QueueFilterDto, QueueJobFilterDto } from './dto';

@Injectable()
export class AiQueueManagementRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async createQueue(data: Partial<IAiQueue>): Promise<IAiQueue> {
    return this.prisma.aiQueue.create({
      data: data as any,
    }) as Promise<IAiQueue>;
  }

  async updateQueue(id: string, data: Partial<IAiQueue>): Promise<IAiQueue> {
    return this.prisma.aiQueue.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiQueue>;
  }

  async findQueueById(id: string): Promise<IAiQueue | null> {
    return this.prisma.aiQueue.findFirst({
      where: { id, deletedAt: null },
    }) as Promise<IAiQueue | null>;
  }

  async findQueueByName(name: string): Promise<IAiQueue | null> {
    return this.prisma.aiQueue.findFirst({
      where: { name, deletedAt: null },
    }) as Promise<IAiQueue | null>;
  }

  async findAllQueues(
    filter: QueueFilterDto,
  ): Promise<[IAiQueue[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (filter.workspaceId) where.workspaceId = filter.workspaceId;
    if (filter.name) where.name = filter.name;
    if (filter.status) where.status = filter.status;
    if (filter.tag) {
      where.tags = { has: filter.tag };
    }

    const [data, total] = await Promise.all([
      this.prisma.aiQueue.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aiQueue.count({ where }),
    ]);

    return [data as IAiQueue[], total];
  }

  async deleteQueue(id: string): Promise<void> {
    await this.prisma.aiQueue.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async createQueueJob(data: Partial<IAiQueueJob>): Promise<IAiQueueJob> {
    return this.prisma.aiQueueJob.create({
      data: data as any,
    }) as Promise<IAiQueueJob>;
  }

  async updateQueueJob(
    id: string,
    data: Partial<IAiQueueJob>,
  ): Promise<IAiQueueJob> {
    return this.prisma.aiQueueJob.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiQueueJob>;
  }

  async findQueueJobById(id: string): Promise<IAiQueueJob | null> {
    return this.prisma.aiQueueJob.findUnique({
      where: { id },
    }) as Promise<IAiQueueJob | null>;
  }

  async findQueueJobByIdempotencyKey(
    workspaceId: string,
    idempotencyKey: string,
  ): Promise<IAiQueueJob | null> {
    return this.prisma.aiQueueJob.findFirst({
      where: { workspaceId, idempotencyKey },
    }) as Promise<IAiQueueJob | null>;
  }

  async findAllQueueJobs(
    filter: QueueJobFilterDto,
  ): Promise<[IAiQueueJob[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filter.workspaceId) where.workspaceId = filter.workspaceId;
    if (filter.queueId) where.queueId = filter.queueId;
    if (filter.jobType) where.jobType = filter.jobType;
    if (filter.status) where.status = filter.status;
    if (filter.priority) where.priority = filter.priority;
    if (filter.batchId) where.batchId = filter.batchId;
    if (filter.modelProvider) where.modelProvider = filter.modelProvider;
    if (filter.capability) where.capability = filter.capability;

    if (filter.queueName) {
      const queue = await this.findQueueByName(filter.queueName);
      if (queue) {
        where.queueId = queue.id;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.aiQueueJob.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      }),
      this.prisma.aiQueueJob.count({ where }),
    ]);

    return [data as IAiQueueJob[], total];
  }

  async findNextJobsToProcess(
    queueId: string,
    limit: number,
  ): Promise<IAiQueueJob[]> {
    return this.prisma.aiQueueJob.findMany({
      where: {
        queueId,
        status: AiQueueJobStatus.WAITING,
        OR: [
          { scheduledFor: null },
          { scheduledFor: { lte: new Date() } },
        ],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: limit,
    }) as Promise<IAiQueueJob[]>;
  }

  async findDelayedJobs(queueId: string): Promise<IAiQueueJob[]> {
    return this.prisma.aiQueueJob.findMany({
      where: {
        queueId,
        status: AiQueueJobStatus.DELAYED,
        scheduledFor: { lte: new Date() },
      },
      orderBy: { scheduledFor: 'asc' },
    }) as Promise<IAiQueueJob[]>;
  }

  async findStuckJobs(queueId: string, timeout: number): Promise<IAiQueueJob[]> {
    const cutoffTime = new Date(Date.now() - timeout);

    return this.prisma.aiQueueJob.findMany({
      where: {
        queueId,
        status: AiQueueJobStatus.ACTIVE,
        startedAt: { lt: cutoffTime },
      },
    }) as Promise<IAiQueueJob[]>;
  }

  async createMetrics(data: Partial<IAiQueueMetrics>): Promise<IAiQueueMetrics> {
    return this.prisma.aiQueueMetrics.create({
      data: data as any,
    }) as Promise<IAiQueueMetrics>;
  }

  async findLatestMetrics(queueId: string): Promise<IAiQueueMetrics | null> {
    return this.prisma.aiQueueMetrics.findFirst({
      where: { queueId },
      orderBy: { timestamp: 'desc' },
    }) as Promise<IAiQueueMetrics | null>;
  }

  async createFailure(data: Partial<IAiQueueFailure>): Promise<IAiQueueFailure> {
    return this.prisma.aiQueueFailure.create({
      data: data as any,
    }) as Promise<IAiQueueFailure>;
  }

  async findFailuresByJobId(queueJobId: string): Promise<IAiQueueFailure[]> {
    return this.prisma.aiQueueFailure.findMany({
      where: { queueJobId },
      orderBy: { failedAt: 'desc' },
    }) as Promise<IAiQueueFailure[]>;
  }

  async findDeadLetterJobs(queueId: string): Promise<IAiQueueFailure[]> {
    return this.prisma.aiQueueFailure.findMany({
      where: {
        queueId,
        movedToDeadLetter: true,
      },
      orderBy: { failedAt: 'desc' },
    }) as Promise<IAiQueueFailure[]>;
  }

  async getQueueJobCounts(queueId: string): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.prisma.aiQueueJob.count({
        where: { queueId, status: AiQueueJobStatus.WAITING },
      }),
      this.prisma.aiQueueJob.count({
        where: { queueId, status: AiQueueJobStatus.ACTIVE },
      }),
      this.prisma.aiQueueJob.count({
        where: { queueId, status: AiQueueJobStatus.COMPLETED },
      }),
      this.prisma.aiQueueJob.count({
        where: { queueId, status: AiQueueJobStatus.FAILED },
      }),
      this.prisma.aiQueueJob.count({
        where: { queueId, status: AiQueueJobStatus.DELAYED },
      }),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  async getQueueStats(
    queueId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    const where: any = { queueId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const stats = await this.prisma.aiQueueJob.aggregate({
      where,
      _count: { id: true },
      _sum: {
        cost: true,
        tokens: true,
        processingTime: true,
      },
      _avg: {
        processingTime: true,
      },
    });

    const completedCount = await this.prisma.aiQueueJob.count({
      where: { ...where, status: AiQueueJobStatus.COMPLETED },
    });

    const failedCount = await this.prisma.aiQueueJob.count({
      where: { ...where, status: AiQueueJobStatus.FAILED },
    });

    return {
      totalProcessed: stats._count.id,
      completedJobs: completedCount,
      failedJobs: failedCount,
      totalCost: stats._sum.cost || 0,
      totalTokens: stats._sum.tokens || 0,
      avgProcessingTime: stats._avg.processingTime || 0,
      totalProcessingTime: stats._sum.processingTime || 0,
    };
  }

  async cleanupOldJobs(
    queueId: string,
    retentionDays: number,
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.prisma.aiQueueJob.deleteMany({
      where: {
        queueId,
        status: {
          in: [AiQueueJobStatus.COMPLETED, AiQueueJobStatus.FAILED],
        },
        completedAt: { lt: cutoffDate },
      },
    });

    return result.count;
  }
}
