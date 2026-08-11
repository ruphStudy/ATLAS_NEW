import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../database/base.repository';
import { PrismaService } from '../../../database/prisma.service';
import { QueueType, JobState } from '../interfaces';

@Injectable()
export class QueueManagerRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findQueueConfig(queueName: string) {
    return this.findUnique('MarketplaceQueueConfig', { queueName });
  }

  async findAllQueueConfigs() {
    return this.findMany('MarketplaceQueueConfig', {});
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
    return this.create('MarketplaceQueueConfig', data);
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
    return this.update('MarketplaceQueueConfig', { queueName }, data);
  }

  async findJobMetadata(workspaceId: string, jobId: string) {
    return this.findUnique('MarketplaceJobMetadata', {
      id: jobId,
      workspaceId,
    });
  }

  async findJobsByState(
    workspaceId: string,
    queueType: QueueType,
    state: JobState,
  ) {
    return this.findMany('MarketplaceJobMetadata', {
      workspaceId,
      queueType,
      state,
    });
  }

  async findJobsByQueue(workspaceId: string, queueName: string) {
    return this.findMany('MarketplaceJobMetadata', {
      workspaceId,
      queueName,
    });
  }

  async findStaleJobs(queueType: QueueType, thresholdDate: Date) {
    return this.findMany('MarketplaceJobMetadata', {
      queueType,
      state: JobState.ACTIVE,
      processedAt: { lte: thresholdDate },
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
    return this.create('MarketplaceJobMetadata', data);
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
    return this.update(
      'MarketplaceJobMetadata',
      { id: jobId, workspaceId },
      data,
    );
  }

  async findByIdempotencyKey(workspaceId: string, idempotencyKey: string) {
    const jobs = await this.findMany('MarketplaceJobMetadata', {
      workspaceId,
      idempotencyKey,
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
    return this.create('MarketplaceJobHistory', {
      ...data,
      timestamp: new Date(),
    });
  }

  async findJobHistory(workspaceId: string, jobId: string) {
    return this.findMany(
      'MarketplaceJobHistory',
      {
        workspaceId,
        jobId,
      },
      {
        orderBy: { timestamp: 'asc' },
      },
    );
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
    return this.create('MarketplaceDeadLetterJob', {
      ...data,
      failedAt: new Date(),
      isReprocessed: false,
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

    return this.findMany('MarketplaceDeadLetterJob', where, {
      orderBy: { failedAt: 'desc' },
    });
  }

  async markDeadLetterJobReprocessed(workspaceId: string, jobId: string) {
    return this.update(
      'MarketplaceDeadLetterJob',
      { id: jobId, workspaceId },
      {
        isReprocessed: true,
        reprocessedAt: new Date(),
      },
    );
  }

  async findRateLimitConfig(
    workspaceId: string,
    provider: string,
    accountId: string | undefined,
    queueType: QueueType,
  ) {
    return this.findUnique('MarketplaceQueueRateLimit', {
      workspaceId,
      provider,
      accountId: accountId || '',
      queueType,
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
    return this.create('MarketplaceQueueRateLimit', {
      ...data,
      accountId: data.accountId || '',
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
    return this.update(
      'MarketplaceQueueRateLimit',
      {
        workspaceId,
        provider,
        accountId: accountId || '',
        queueType,
      },
      data,
    );
  }

  async aggregateErrorsByType(
    workspaceId: string,
    queueType: QueueType,
    startDate: Date,
    endDate: Date,
  ) {
    const jobs = await this.findMany('MarketplaceJobMetadata', {
      workspaceId,
      queueType,
      state: JobState.FAILED,
      finishedAt: {
        gte: startDate,
        lte: endDate,
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
      const errorType = this.extractErrorType(job.failedReason);
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
    return this.count('MarketplaceJobMetadata', {
      workspaceId,
      queueType,
      state,
    });
  }

  async deleteJobMetadata(workspaceId: string, jobId: string) {
    return this.delete('MarketplaceJobMetadata', {
      id: jobId,
      workspaceId,
    });
  }
}
