import { Injectable } from '@nestjs/common';
import { Queue, Job } from 'bullmq';
import { QueueManager } from './queue.manager';
import { QueueManagerRepository } from '../repository/queue-manager.repository';
import {
  QueueType,
  JobState,
  JobPriority,
  IJobOptions,
  IJobPayload,
  IJobInfo,
  IJobRetryOptions,
  IJobCancellationOptions,
  IBulkJobRequest,
  QueueOperationResult,
  IStaleJobCriteria,
} from '../interfaces';

@Injectable()
export class JobManager {
  constructor(
    private readonly queueManager: QueueManager,
    private readonly repository: QueueManagerRepository,
  ) {}

  async addJob(
    queueType: QueueType,
    payload: IJobPayload,
    options?: IJobOptions,
  ): Promise<QueueOperationResult> {
    const queue = this.queueManager.getQueue(queueType);
    if (!queue) {
      return {
        success: false,
        message: `Queue not found: ${queueType}`,
      };
    }

    if (options?.idempotencyKey) {
      const existingJob = await this.repository.findByIdempotencyKey(
        payload.workspaceId,
        options.idempotencyKey,
      );

      if (existingJob) {
        return {
          success: false,
          message: 'Duplicate job prevented by idempotency key',
          jobId: existingJob.id as string,
          metadata: { reason: 'DUPLICATE_IDEMPOTENCY_KEY' },
        };
      }
    }

    const jobOptions = this.buildJobOptions(options);
    const job = await queue.add(payload.type, payload, jobOptions);

    await this.repository.createJobMetadata({
      id: job.id!,
      workspaceId: payload.workspaceId,
      queueName: queue.name,
      queueType,
      provider: payload.provider,
      accountId: payload.accountId,
      state: JobState.WAITING,
      priority: options?.priority || JobPriority.NORMAL,
      attempts: 0,
      maxAttempts: options?.attempts || 3,
      payload: payload as any,
      idempotencyKey: options?.idempotencyKey,
      addedAt: new Date(),
    });

    await this.repository.createJobHistory({
      jobId: job.id!,
      workspaceId: payload.workspaceId,
      queueName: queue.name,
      queueType,
      state: JobState.WAITING,
      event: 'JOB_ADDED',
      message: `Job added to queue ${queueType}`,
    });

    return {
      success: true,
      message: 'Job added successfully',
      queueName: queue.name,
      jobId: job.id,
    };
  }

  async addBulkJobs(
    request: IBulkJobRequest,
  ): Promise<QueueOperationResult> {
    const queue = this.queueManager.getQueue(request.queueType);
    if (!queue) {
      return {
        success: false,
        message: `Queue not found: ${request.queueType}`,
      };
    }

    const jobsData = request.jobs.map((job) => {
      const payload: IJobPayload = {
        workspaceId: request.workspaceId,
        provider: request.provider,
        accountId: request.accountId,
        type: job.type,
        data: job.data,
      };

      return {
        name: job.type,
        data: payload,
        opts: this.buildJobOptions(job.options),
      };
    });

    const jobs = await queue.addBulk(jobsData);

    for (const job of jobs) {
      await this.repository.createJobMetadata({
        id: job.id!,
        workspaceId: request.workspaceId,
        queueName: queue.name,
        queueType: request.queueType,
        provider: request.provider,
        accountId: request.accountId,
        state: JobState.WAITING,
        priority: JobPriority.NORMAL,
        attempts: 0,
        maxAttempts: 3,
        payload: job.data as any,
        addedAt: new Date(),
      });
    }

    return {
      success: true,
      message: `${jobs.length} jobs added successfully`,
      queueName: queue.name,
      jobIds: jobs.map((j) => j.id!),
    };
  }

  async getJob(
    workspaceId: string,
    queueType: QueueType,
    jobId: string,
  ): Promise<IJobInfo | null> {
    const queue = this.queueManager.getQueue(queueType);
    if (!queue) return null;

    const job = await queue.getJob(jobId);
    if (!job) return null;

    const metadata = await this.repository.findJobMetadata(workspaceId, jobId);
    if (!metadata) return null;

    return this.mapToJobInfo(job, metadata);
  }

  async listJobs(
    workspaceId: string,
    queueType: QueueType,
    state: JobState,
  ): Promise<IJobInfo[]> {
    const jobs = await this.repository.findJobsByState(
      workspaceId,
      queueType,
      state,
    );

    const queue = this.queueManager.getQueue(queueType);
    if (!queue) return [];

    const jobInfos: IJobInfo[] = [];

    for (const metadata of jobs) {
      const job = await queue.getJob(metadata.id as string);
      if (job) {
        jobInfos.push(this.mapToJobInfo(job, metadata));
      }
    }

    return jobInfos;
  }

  async retryJob(
    options: IJobRetryOptions,
  ): Promise<QueueOperationResult> {
    const queue = this.queueManager.getQueue(options.queueType);
    if (!queue) {
      return {
        success: false,
        message: `Queue not found: ${options.queueType}`,
      };
    }

    const job = await queue.getJob(options.jobId);
    if (!job) {
      return {
        success: false,
        message: `Job not found: ${options.jobId}`,
      };
    }

    const state = await job.getState();
    if (state !== 'failed') {
      return {
        success: false,
        message: `Job is not in failed state: ${state}`,
      };
    }

    if (options.resetAttempts) {
      await job.updateData({ ...job.data, attemptsMade: 0 });
    }

    await job.retry();

    await this.repository.updateJobMetadata(
      options.workspaceId,
      options.jobId,
      {
        state: JobState.WAITING,
        attempts: options.resetAttempts ? 0 : undefined,
      },
    );

    await this.repository.createJobHistory({
      jobId: options.jobId,
      workspaceId: options.workspaceId,
      queueName: queue.name,
      queueType: options.queueType,
      state: JobState.WAITING,
      event: 'JOB_RETRIED',
      message: 'Job retried manually',
    });

    return {
      success: true,
      message: 'Job retried successfully',
      jobId: options.jobId,
    };
  }

  async cancelJob(
    options: IJobCancellationOptions,
  ): Promise<QueueOperationResult> {
    const queue = this.queueManager.getQueue(options.queueType);
    if (!queue) {
      return {
        success: false,
        message: `Queue not found: ${options.queueType}`,
      };
    }

    const job = await queue.getJob(options.jobId);
    if (!job) {
      return {
        success: false,
        message: `Job not found: ${options.jobId}`,
      };
    }

    const state = await job.getState();
    if (state === 'completed' || state === 'failed') {
      return {
        success: false,
        message: `Cannot cancel job in ${state} state`,
      };
    }

    if (options.removeFromQueue) {
      await job.remove();
    } else {
      await job.updateData({ ...job.data, cancelled: true });
    }

    await this.repository.updateJobMetadata(
      options.workspaceId,
      options.jobId,
      {
        state: JobState.CANCELLED,
        finishedAt: new Date(),
      },
    );

    await this.repository.createJobHistory({
      jobId: options.jobId,
      workspaceId: options.workspaceId,
      queueName: queue.name,
      queueType: options.queueType,
      state: JobState.CANCELLED,
      event: 'JOB_CANCELLED',
      message: options.reason || 'Job cancelled manually',
    });

    return {
      success: true,
      message: 'Job cancelled successfully',
      jobId: options.jobId,
    };
  }

  async recoverStaleJobs(
    criteria: IStaleJobCriteria,
  ): Promise<QueueOperationResult> {
    const thresholdDate = new Date(
      Date.now() - criteria.olderThanMinutes * 60 * 1000,
    );

    const staleJobs = (await this.repository.findStaleJobs(
      criteria.queueType,
      thresholdDate,
    )) as unknown as Array<{ id: string; workspaceId: string }>;

    const filteredJobs = criteria.workspaceId
      ? staleJobs.filter((job) => job.workspaceId === criteria.workspaceId)
      : staleJobs;

    const queue = this.queueManager.getQueue(criteria.queueType);
    if (!queue) {
      return {
        success: false,
        message: `Queue not found: ${criteria.queueType}`,
      };
    }

    let recoveredCount = 0;

    for (const jobMetadata of filteredJobs) {
      const job = await queue.getJob(jobMetadata.id);
      if (job) {
        const state = await job.getState();
        if (state === 'active') {
          await job.moveToFailed(
            new Error('Job marked as stale'),
            '0',
            false,
          );

          await this.repository.updateJobMetadata(
            jobMetadata.workspaceId,
            jobMetadata.id,
            {
              state: JobState.STALE,
              finishedAt: new Date(),
              failedReason: 'Job marked as stale after timeout',
            },
          );

          await this.repository.createJobHistory({
            jobId: jobMetadata.id,
            workspaceId: jobMetadata.workspaceId,
            queueName: queue.name,
            queueType: criteria.queueType,
            state: JobState.STALE,
            event: 'JOB_STALE',
            message: `Job marked as stale after ${criteria.olderThanMinutes} minutes`,
          });

          recoveredCount++;
        }
      }
    }

    return {
      success: true,
      message: `Recovered ${recoveredCount} stale jobs`,
      metadata: { recoveredCount, totalStale: filteredJobs.length },
    };
  }

  async getJobHistory(workspaceId: string, jobId: string) {
    return this.repository.findJobHistory(workspaceId, jobId);
  }

  private buildJobOptions(options?: IJobOptions): any {
    const defaultOptions: any = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    };

    if (!options) return defaultOptions;

    return {
      ...defaultOptions,
      priority: options.priority,
      delay: options.delay,
      attempts: options.attempts ?? defaultOptions.attempts,
      backoff: options.backoff
        ? {
            type: options.backoff.type.toLowerCase(),
            delay: options.backoff.delay,
          }
        : defaultOptions.backoff,
      removeOnComplete: options.removeOnComplete ?? defaultOptions.removeOnComplete,
      removeOnFail: options.removeOnFail ?? defaultOptions.removeOnFail,
      timeout: options.timeout,
      jobId: options.jobId || options.idempotencyKey,
    };
  }

  private mapToJobInfo(job: Job, metadata: any): IJobInfo {
    return {
      id: job.id!,
      queueName: metadata.queueName,
      queueType: metadata.queueType,
      workspaceId: metadata.workspaceId,
      provider: metadata.provider,
      accountId: metadata.accountId,
      state: this.mapJobState(job),
      priority: metadata.priority,
      attempts: job.attemptsMade,
      maxAttempts: metadata.maxAttempts,
      progress: job.progress as number,
      data: job.data,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace ?? undefined,
      addedAt: new Date(job.timestamp),
      processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
      finishedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
      delay: job.delay,
      timestamp: new Date(job.timestamp),
    };
  }

  private mapJobState(job: Job): JobState {
    const stateMap: Record<string, JobState> = {
      waiting: JobState.WAITING,
      active: JobState.ACTIVE,
      delayed: JobState.DELAYED,
      completed: JobState.COMPLETED,
      failed: JobState.FAILED,
    };

    return stateMap[job.name] || JobState.WAITING;
  }
}
