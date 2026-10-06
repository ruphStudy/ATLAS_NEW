import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../database/base.repository';
import { PrismaService } from '../../../database/prisma.service';
import { QueueType, JobState } from '../interfaces';

interface IJobMetadataRecord {
  id: string;
  failedReason: string | null;
  finishedAt: Date | null;
}

@Injectable()
export class QueueManagerRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private model(name: string) {
    return (this.prisma as unknown as Record<string, unknown>)[name] as Record<string, unknown>;
  }

  private call<T>(model: string, method: string, args: unknown): Promise<T> {
    const m = this.model(model);
    return (m[method] as (a: unknown) => Promise<T>)(args);
  }

  async findQueueConfig(queueName: string) {
    return this.call<Record<string, unknown> | null>('marketplaceQueueConfig', 'findFirst', {
      where: { queueName },
    });
  }

  async findAllQueueConfigs() {
    return this.call<Record<string, unknown>[]>('marketplaceQueueConfig', 'findMany', {
      where: {},
    });
  }

  async createQueueConfig(data: {
    queueName: string;
    queueType: QueueType;
    concurrency?: number;
    rateLimit?: Record<string, any>;
    defaultJobOptions?: Record<string, any>;
    enableMetrics?: boolean;
    enableDeadLetter?: boolean;
  }) {
    return this.call<Record<string, unknown>>('marketplaceQueueConfig', 'create', { data });
  }

  async updateQueueConfig(
    queueName: string,
    data: Partial<{
      concurrency: number;
      rateLimit: Record<string, any>;
      defaultJobOptions: Record<string, any>;
      enableMetrics: boolean;
      enableDeadLetter: boolean;
    }>,
  ) {
    return this.call<Record<string, unknown>>('marketplaceQueueConfig', 'update', {
      where: { queueName },
      data,
    });
  }

  async findJobMetadata(workspaceId: string, jobId: string) {
    return this.call<Record<string, unknown> | null>('marketplaceJobMetadata', 'findFirst', {
      where: { id: jobId, workspaceId },
    });
  }

  async findJobsByState(
    workspaceId: string,
    queueType: QueueType,
    state: JobState,
  ) {
    return this.call<Record<string, unknown>[]>('marketplaceJobMetadata', 'findMany', {
      where: { workspaceId, queueType, state },
    });
  }

  async findJobsByQueue(workspaceId: string, queueName: string) {
    return this.call<Record<string, unknown>[]>('marketplaceJobMetadata', 'findMany', {
      where: { workspaceId, queueName },
    });
  }

  async findStaleJobs(queueType: QueueType, thresholdDate: Date) {
    return this.call<Record<string, unknown>[]>('marketplaceJobMetadata', 'findMany', {
      where: {
        queueType,
        state: JobState.ACTIVE,
        processedAt: { lte: thresholdDate },
      },
    });
  }

  async createJobMetadata(data: {
    id: string;
    workspaceId: string;
    queueName: string;
    queueType: QueueType;
    provider: string;
    accountId?: string;
    state: JobState;
    priority: number;
    attempts: number;
    maxAttempts: number;
    payload: Record<string, any>;
    idempotencyKey?: string;
    addedAt: Date;
  }) {
    return this.call<Record<string, unknown>>('marketplaceJobMetadata', 'create', { data });
  }

  async updateJobMetadata(
    workspaceId: string,
    jobId: string,
    data: Partial<{
      state: JobState;
      attempts: number;
      progress: number;
      processedAt: Date;
      finishedAt: Date;
      failedReason: string;
      stacktrace: string[];
    }>,
  ) {
    return this.call<Record<string, unknown>>('marketplaceJobMetadata', 'update', {
      where: { id: jobId, workspaceId },
      data,
    });
  }

  async findByIdempotencyKey(workspaceId: string, idempotencyKey: string) {
    const jobs = await this.call<Record<string, unknown>[]>('marketplaceJobMetadata', 'findMany', {
      where: { workspaceId, idempotencyKey },
    });
    return jobs[0] || null;
  }

  async createJobHistory(data: {
    jobId: string;
    workspaceId: string;
    queueName: string;
    queueType: QueueType;
    state: JobState;
    event: string;
    message?: string;
    metadata?: Record<string, any>;
  }) {
    return this.call<Record<string, unknown>>('marketplaceJobHistory', 'create', {
      data: {
        ...data,
        timestamp: new Date(),
      },
    });
  }

  async findJobHistory(workspaceId: string, jobId: string) {
    return this.call<Record<string, unknown>[]>('marketplaceJobHistory', 'findMany', {
      where: {
        workspaceId,
        jobId,
      },
      orderBy: { timestamp: 'asc' },
    });
  }

  async createDeadLetterJob(data: {
    workspaceId: string;
    queueName: string;
    queueType: QueueType;
    provider: string;
    accountId?: string;
    originalJobId: string;
    payload: Record<string, any>;
    failedReason: string;
    attempts: number;
  }) {
    return this.call<Record<string, unknown>>('marketplaceDeadLetterJob', 'create', {
      data: {
        ...data,
        failedAt: new Date(),
        isReprocessed: false,
      },
    });
  }

  async findDeadLetterJobs(workspaceId: string, queueType?: QueueType) {
    const where: any = {
      workspaceId,
      isReprocessed: false,
    };

    if (queueType) {
      where.queueType = queueType;
    }

    return this.call<Record<string, unknown>[]>('marketplaceDeadLetterJob', 'findMany', {
      where,
      orderBy: { failedAt: 'desc' },
    });
  }

  async findDeadLetterJobById(id: string, workspaceId: string) {
    return this.call<Record<string, unknown> | null>('marketplaceDeadLetterJob', 'findFirst', {
      where: { id, workspaceId },
    });
  }

  async markDeadLetterJobReprocessed(workspaceId: string, jobId: string) {
    return this.call<Record<string, unknown>>('marketplaceDeadLetterJob', 'update', {
      where: { id: jobId, workspaceId },
      data: {
        isReprocessed: true,
        reprocessedAt: new Date(),
      },
    });
  }

  async findRateLimitConfig(
    workspaceId: string,
    provider: string,
    accountId: string | undefined,
    queueType: QueueType,
  ) {
    return this.call<Record<string, unknown> | null>('marketplaceQueueRateLimit', 'findFirst', {
      where: {
        workspaceId,
        provider,
        accountId: accountId || '',
        queueType,
      },
    });
  }

  async createRateLimitConfig(data: {
    workspaceId: string;
    provider: string;
    accountId?: string;
    queueType: QueueType;
    maxConcurrent: number;
    maxPerMinute: number;
    maxPerHour: number;
    isEnabled: boolean;
  }) {
    return this.call<Record<string, unknown>>('marketplaceQueueRateLimit', 'create', {
      data: {
        ...data,
        accountId: data.accountId || '',
      },
    });
  }

  async updateRateLimitConfig(
    workspaceId: string,
    provider: string,
    accountId: string | undefined,
    queueType: QueueType,
    data: Partial<{
      maxConcurrent: number;
      maxPerMinute: number;
      maxPerHour: number;
      isEnabled: boolean;
    }>,
  ) {
    return this.call<Record<string, unknown>>('marketplaceQueueRateLimit', 'update', {
      where: {
        workspaceId_provider_accountId_queueType: {
          workspaceId,
          provider,
          accountId: accountId || '',
          queueType,
        },
      },
      data,
    });
  }

  async aggregateErrorsByType(
    workspaceId: string,
    queueType: QueueType,
    startDate: Date,
    endDate: Date,
  ) {
    const jobs = await this.call<IJobMetadataRecord[]>('marketplaceJobMetadata', 'findMany', {
      where: {
        workspaceId,
        queueType,
        state: JobState.FAILED,
        finishedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const errorMap = new Map<
      string,
      {
        type: string;
        message: string;
        count: number;
        jobs: string[];
        firstOccurrence: Date;
        lastOccurrence: Date;
      }
    >();

    for (const job of jobs) {
      const errorType = this.extractErrorType(job.failedReason ?? undefined);
      if (!errorMap.has(errorType)) {
        errorMap.set(errorType, {
          type: errorType,
          message: job.failedReason || 'Unknown error',
          count: 0,
          jobs: [],
          firstOccurrence: job.finishedAt!,
          lastOccurrence: job.finishedAt!,
        });
      }

      const entry = errorMap.get(errorType)!;
      entry.count++;
      entry.jobs.push(job.id);
      if (job.finishedAt! < entry.firstOccurrence) {
        entry.firstOccurrence = job.finishedAt!;
      }
      if (job.finishedAt! > entry.lastOccurrence) {
        entry.lastOccurrence = job.finishedAt!;
      }
    }

    return Array.from(errorMap.values());
  }

  private extractErrorType(error?: string): string {
    if (!error) return 'UNKNOWN';
    if (error.includes('timeout')) return 'TIMEOUT';
    if (error.includes('rate limit')) return 'RATE_LIMITED';
    if (error.includes('authentication')) return 'AUTHENTICATION_ERROR';
    if (error.includes('network')) return 'NETWORK_ERROR';
    if (error.includes('validation')) return 'VALIDATION_ERROR';
    return 'UNKNOWN';
  }

  async countJobsByState(
    workspaceId: string,
    queueType: QueueType,
    state: JobState,
  ) {
    return this.call<number>('marketplaceJobMetadata', 'count', {
      where: { workspaceId, queueType, state },
    });
  }

  async deleteJobMetadata(workspaceId: string, jobId: string) {
    return this.call<Record<string, unknown>>('marketplaceJobMetadata', 'delete', {
      where: { id: jobId, workspaceId },
    });
  }
}
