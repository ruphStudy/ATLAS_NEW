import { Injectable } from '@nestjs/common';
import { QueueManager } from './manager/queue.manager';
import { JobManager } from './manager/job.manager';
import { QueueManagerRepository } from './repository/queue-manager.repository';
import { QueueLifecycleEventQueue } from './events/queue-lifecycle-event.queue';
import { QueueMetricsService } from './metrics/queue-metrics.service';
import {
  QueueType,
  JobState,
  IJobPayload,
  IJobOptions,
  IJobInfo,
  IJobRetryOptions,
  IJobCancellationOptions,
  IBulkJobRequest,
  IQueueMetrics,
  IQueueHealth,
  IDeadLetterJob,
  IJobHistory,
  IStaleJobCriteria,
  IRateLimitConfig,
  QueueOperationResult,
  QueueLifecycleEvent,
  ErrorSummary,
} from './interfaces';
import { AggregatedQueueMetrics } from './metrics/queue-metrics.service';

@Injectable()
export class MarketplaceQueueManagerService {
  constructor(
    private readonly queueManager: QueueManager,
    private readonly jobManager: JobManager,
    private readonly repository: QueueManagerRepository,
    private readonly lifecycleQueue: QueueLifecycleEventQueue,
    private readonly metricsService: QueueMetricsService,
  ) {}

  async addJob(
    queueType: QueueType,
    payload: IJobPayload,
    options?: IJobOptions,
  ): Promise<QueueOperationResult> {
    const result = await this.jobManager.addJob(queueType, payload, options);

    if (result.success) {
      await this.lifecycleQueue.publish({
        eventType: QueueLifecycleEvent.JOB_ADDED,
        queueName: result.queueName!,
        queueType,
        workspaceId: payload.workspaceId,
        provider: payload.provider,
        accountId: payload.accountId,
        jobId: result.jobId,
        timestamp: new Date(),
      });
    } else if (result.metadata?.reason === 'DUPLICATE_IDEMPOTENCY_KEY') {
      await this.lifecycleQueue.publish({
        eventType: QueueLifecycleEvent.JOB_DUPLICATE_PREVENTED,
        queueName: result.queueName || '',
        queueType,
        workspaceId: payload.workspaceId,
        provider: payload.provider,
        accountId: payload.accountId,
        jobId: result.jobId,
        message: 'Duplicate job prevented by idempotency key',
        timestamp: new Date(),
      });
    }

    return result;
  }

  async addBulkJobs(request: IBulkJobRequest): Promise<QueueOperationResult> {
    const result = await this.jobManager.addBulkJobs(request);

    if (result.success) {
      await this.lifecycleQueue.publish({
        eventType: QueueLifecycleEvent.JOB_ADDED,
        queueName: result.queueName!,
        queueType: request.queueType,
        workspaceId: request.workspaceId,
        provider: request.provider,
        accountId: request.accountId,
        message: `${result.jobIds?.length} jobs added`,
        metadata: { jobIds: result.jobIds },
        timestamp: new Date(),
      });
    }

    return result;
  }

  async getJob(
    workspaceId: string,
    queueType: QueueType,
    jobId: string,
  ): Promise<IJobInfo | null> {
    return this.jobManager.getJob(workspaceId, queueType, jobId);
  }

  async listJobs(
    workspaceId: string,
    queueType: QueueType,
    state: JobState,
  ): Promise<IJobInfo[]> {
    return this.jobManager.listJobs(workspaceId, queueType, state);
  }

  async retryJob(options: IJobRetryOptions): Promise<QueueOperationResult> {
    const result = await this.jobManager.retryJob(options);

    if (result.success) {
      await this.lifecycleQueue.publish({
        eventType: QueueLifecycleEvent.JOB_RETRIED,
        queueName: '',
        queueType: options.queueType,
        workspaceId: options.workspaceId,
        jobId: options.jobId,
        timestamp: new Date(),
      });
    }

    return result;
  }

  async cancelJob(
    options: IJobCancellationOptions,
  ): Promise<QueueOperationResult> {
    const result = await this.jobManager.cancelJob(options);

    if (result.success) {
      await this.lifecycleQueue.publish({
        eventType: QueueLifecycleEvent.JOB_CANCELLED,
        queueName: '',
        queueType: options.queueType,
        workspaceId: options.workspaceId,
        jobId: options.jobId,
        message: options.reason,
        timestamp: new Date(),
      });
    }

    return result;
  }

  async recoverStaleJobs(
    criteria: IStaleJobCriteria,
  ): Promise<QueueOperationResult> {
    const result = await this.jobManager.recoverStaleJobs(criteria);

    if (result.success && result.metadata?.recoveredCount > 0) {
      await this.lifecycleQueue.publish({
        eventType: QueueLifecycleEvent.JOB_STALE,
        queueName: '',
        queueType: criteria.queueType,
        workspaceId: criteria.workspaceId,
        message: `Recovered ${result.metadata.recoveredCount} stale jobs`,
        metadata: result.metadata,
        timestamp: new Date(),
      });
    }

    return result;
  }

  async getJobHistory(
    workspaceId: string,
    jobId: string,
  ): Promise<IJobHistory[]> {
    return this.jobManager.getJobHistory(workspaceId, jobId);
  }

  async pauseQueue(queueType: QueueType): Promise<QueueOperationResult> {
    const result = await this.queueManager.pauseQueue(queueType);

    if (result.success) {
      await this.lifecycleQueue.publish({
        eventType: QueueLifecycleEvent.QUEUE_PAUSED,
        queueName: result.queueName!,
        queueType,
        timestamp: new Date(),
      });
    }

    return result;
  }

  async resumeQueue(queueType: QueueType): Promise<QueueOperationResult> {
    const result = await this.queueManager.resumeQueue(queueType);

    if (result.success) {
      await this.lifecycleQueue.publish({
        eventType: QueueLifecycleEvent.QUEUE_RESUMED,
        queueName: result.queueName!,
        queueType,
        timestamp: new Date(),
      });
    }

    return result;
  }

  async drainQueue(
    queueType: QueueType,
    delayed: boolean = false,
  ): Promise<QueueOperationResult> {
    const result = await this.queueManager.drainQueue(queueType, delayed);

    if (result.success) {
      await this.lifecycleQueue.publish({
        eventType: QueueLifecycleEvent.QUEUE_DRAINED,
        queueName: result.queueName!,
        queueType,
        metadata: { delayed },
        timestamp: new Date(),
      });
    }

    return result;
  }

  async cleanQueue(
    queueType: QueueType,
    grace: number,
    limit: number,
    type: 'completed' | 'failed',
  ): Promise<QueueOperationResult> {
    return this.queueManager.cleanQueue(queueType, grace, limit, type);
  }

  async getQueueMetrics(queueType: QueueType): Promise<IQueueMetrics | null> {
    return this.queueManager.getQueueMetrics(queueType);
  }

  async getQueueHealth(queueType: QueueType): Promise<IQueueHealth | null> {
    return this.queueManager.getQueueHealth(queueType);
  }

  async getAllQueueMetrics(): Promise<IQueueMetrics[]> {
    return this.queueManager.getAllQueueMetrics();
  }

  async getAggregatedMetrics(
    workspaceId: string,
    queueType: QueueType,
  ): Promise<AggregatedQueueMetrics> {
    return this.metricsService.getAggregatedMetrics(workspaceId, queueType);
  }

  async getAllAggregatedMetrics(
    workspaceId: string,
  ): Promise<AggregatedQueueMetrics[]> {
    return this.metricsService.getAllMetrics(workspaceId);
  }

  async getErrorSummary(
    workspaceId: string,
    queueType: QueueType,
    startDate: Date,
    endDate: Date,
  ): Promise<ErrorSummary[]> {
    return this.metricsService.getErrorSummary(
      workspaceId,
      queueType,
      startDate,
      endDate,
    );
  }

  async getDeadLetterJobs(
    workspaceId: string,
    queueType?: QueueType,
  ): Promise<IDeadLetterJob[]> {
    return this.repository.findDeadLetterJobs(workspaceId, queueType);
  }

  async reprocessDeadLetterJob(
    workspaceId: string,
    deadLetterJobId: string,
    options?: IJobOptions,
  ): Promise<QueueOperationResult> {
    const deadLetterJob = await this.repository.findUnique(
      'MarketplaceDeadLetterJob',
      {
        id: deadLetterJobId,
        workspaceId,
      },
    );

    if (!deadLetterJob) {
      return {
        success: false,
        message: 'Dead letter job not found',
      };
    }

    const payload: IJobPayload = deadLetterJob.payload;
    const result = await this.addJob(
      deadLetterJob.queueType,
      payload,
      options,
    );

    if (result.success) {
      await this.repository.markDeadLetterJobReprocessed(
        workspaceId,
        deadLetterJobId,
      );
    }

    return result;
  }

  async getRateLimitConfig(
    workspaceId: string,
    provider: string,
    accountId: string | undefined,
    queueType: QueueType,
  ): Promise<IRateLimitConfig | null> {
    return this.repository.findRateLimitConfig(
      workspaceId,
      provider,
      accountId,
      queueType,
    );
  }

  async createRateLimitConfig(
    config: IRateLimitConfig,
  ): Promise<IRateLimitConfig> {
    return this.repository.createRateLimitConfig(config);
  }

  async updateRateLimitConfig(
    workspaceId: string,
    provider: string,
    accountId: string | undefined,
    queueType: QueueType,
    config: Partial<IRateLimitConfig>,
  ): Promise<IRateLimitConfig> {
    return this.repository.updateRateLimitConfig(
      workspaceId,
      provider,
      accountId,
      queueType,
      config,
    );
  }
}
