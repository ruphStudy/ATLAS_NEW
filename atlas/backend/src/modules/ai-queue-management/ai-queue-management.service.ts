import { Injectable, Logger } from '@nestjs/common';
import { AiQueueManagementRepository } from './ai-queue-management.repository';
import { AiQueueEventQueue } from './jobs';
import { AiWorkflowService } from '@modules/ai-workflow/ai-workflow.service';
import { AiAgentService } from '@modules/ai-agent/ai-agent.service';
import { AiJobSchedulerService } from '@modules/ai-job-scheduler/ai-job-scheduler.service';
import {
  CreateAiQueueDto,
  UpdateAiQueueDto,
  QueueFilterDto,
  EnqueueJobDto,
  EnqueueBatchDto,
  QueueJobFilterDto,
  AiQueueResponseDto,
  PaginatedAiQueueResponseDto,
  QueueJobResponseDto,
  PaginatedQueueJobResponseDto,
  EnqueueResultDto,
  QueueStatsDto,
} from './dto';
import {
  IAiQueue,
  IAiQueueJob,
  IAiQueueMetrics,
  AiQueueStatus,
  AiQueueJobStatus,
  AiQueueJobPriority,
  AiQueueRoutingStrategy,
  AiQueueEvent,
  IEnqueueJobResult,
  IJobProcessingResult,
  IQueueStatsResult,
  IRetryBackoffConfig,
} from './interfaces';
import { ResourceNotFoundException } from '@common/exceptions';
import { BusinessRuleException } from '@common/exceptions';
import { DuplicateResourceException } from '@common/exceptions';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class AiQueueManagementService {
  private readonly logger = new Logger(AiQueueManagementService.name);
  private readonly processingQueues: Map<string, boolean> = new Map();

  constructor(
    private readonly repository: AiQueueManagementRepository,
    private readonly eventQueue: AiQueueEventQueue,
    private readonly workflowService: AiWorkflowService,
    private readonly agentService: AiAgentService,
    private readonly jobSchedulerService: AiJobSchedulerService,
  ) {}

  async createQueue(dto: CreateAiQueueDto): Promise<IAiQueue> {
    const existing = await this.repository.findQueueByName(dto.name);

    if (existing) {
      throw new DuplicateResourceException(
        'Queue with this name already exists',
        ErrorCode.DUPLICATE_RESOURCE,
      );
    }

    const data = {
      workspaceId: dto.workspaceId,
      name: dto.name,
      displayName: dto.displayName,
      description: dto.description,
      status: AiQueueStatus.ACTIVE,
      routingStrategy: dto.routingStrategy || AiQueueRoutingStrategy.PRIORITY,
      routingConfig: dto.routingConfig || null,
      concurrency: dto.concurrency ?? 10,
      rateLimit: dto.rateLimit,
      rateLimitWindow: dto.rateLimitWindow,
      batchSize: dto.batchSize,
      batchWindow: dto.batchWindow,
      defaultPriority: dto.defaultPriority || AiQueueJobPriority.NORMAL,
      defaultTimeout: dto.defaultTimeout,
      defaultRetries: dto.defaultRetries ?? 3,
      retryBackoff: dto.retryBackoff || null,
      enableDeadLetter: dto.enableDeadLetter ?? true,
      deadLetterThreshold: dto.deadLetterThreshold ?? 5,
      enableIdempotency: dto.enableIdempotency ?? true,
      idempotencyTtl: dto.idempotencyTtl,
      enableMetrics: dto.enableMetrics ?? true,
      metricsRetention: dto.metricsRetention,
      tags: dto.tags || [],
      metadata: dto.metadata || {},
    };

    const queue = (await this.repository.createQueue(data)) as IAiQueue;

    await this.eventQueue.publish({
      event: AiQueueEvent.QUEUE_CREATED,
      queueId: queue.id,
      workspaceId: queue.workspaceId ?? undefined,
    });

    return queue;
  }

  async updateQueue(
    id: string,
    dto: UpdateAiQueueDto,
  ): Promise<IAiQueue> {
    await this.findQueueById(id);

    const updated = (await this.repository.updateQueue(id, dto)) as IAiQueue;

    await this.eventQueue.publish({
      event: AiQueueEvent.QUEUE_UPDATED,
      queueId: updated.id,
      workspaceId: updated.workspaceId ?? undefined,
    });

    return updated;
  }

  async pauseQueue(id: string): Promise<IAiQueue> {
    await this.findQueueById(id);

    const paused = await this.repository.updateQueue(id, {
      status: AiQueueStatus.PAUSED,
    });

    await this.eventQueue.publish({
      event: AiQueueEvent.QUEUE_PAUSED,
      queueId: paused.id,
      workspaceId: paused.workspaceId ?? undefined,
    });

    return paused as IAiQueue;
  }

  async resumeQueue(id: string): Promise<IAiQueue> {
    await this.findQueueById(id);

    const resumed = await this.repository.updateQueue(id, {
      status: AiQueueStatus.ACTIVE,
    });

    await this.eventQueue.publish({
      event: AiQueueEvent.QUEUE_RESUMED,
      queueId: resumed.id,
      workspaceId: resumed.workspaceId ?? undefined,
    });

    this.startProcessing(resumed.id);

    return resumed as IAiQueue;
  }

  async drainQueue(id: string): Promise<IAiQueue> {
    await this.findQueueById(id);

    const drained = await this.repository.updateQueue(id, {
      status: AiQueueStatus.DRAINING,
    });

    await this.eventQueue.publish({
      event: AiQueueEvent.QUEUE_DRAINED,
      queueId: drained.id,
      workspaceId: drained.workspaceId ?? undefined,
    });

    return drained as IAiQueue;
  }

  async stopQueue(id: string): Promise<IAiQueue> {
    await this.findQueueById(id);

    const stopped = await this.repository.updateQueue(id, {
      status: AiQueueStatus.STOPPED,
    });

    this.processingQueues.delete(id);

    await this.eventQueue.publish({
      event: AiQueueEvent.QUEUE_STOPPED,
      queueId: stopped.id,
      workspaceId: stopped.workspaceId ?? undefined,
    });

    return stopped as IAiQueue;
  }

  async deleteQueue(id: string): Promise<void> {
    await this.findQueueById(id);
    await this.repository.deleteQueue(id);
    this.processingQueues.delete(id);
  }

  async findQueueById(id: string): Promise<IAiQueue> {
    const queue = await this.repository.findQueueById(id);
    if (!queue) {
      throw new ResourceNotFoundException(
        'Queue not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return queue;
  }

  async findQueueByName(name: string): Promise<IAiQueue> {
    const queue = await this.repository.findQueueByName(name);
    if (!queue) {
      throw new ResourceNotFoundException(
        'Queue not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return queue;
  }

  async findAllQueues(
    filter: QueueFilterDto,
  ): Promise<PaginatedAiQueueResponseDto> {
    const [data, total] = await this.repository.findAllQueues(filter);

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data as AiQueueResponseDto[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  async enqueueJob(dto: EnqueueJobDto): Promise<IEnqueueJobResult> {
    const queue = await this.findQueueByName(dto.queueName);

    if (queue.status === AiQueueStatus.STOPPED) {
      throw new BusinessRuleException(
        'Queue is stopped',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    if (queue.enableIdempotency && dto.idempotencyKey) {
      const existing = await this.repository.findQueueJobByIdempotencyKey(
        dto.workspaceId,
        dto.idempotencyKey,
      );

      if (existing) {
        return {
          jobId: existing.id,
          queueId: existing.queueId,
          status: existing.status,
          priority: existing.priority,
        };
      }
    }

    const jobData = {
      queueId: queue.id,
      workspaceId: dto.workspaceId,
      jobType: dto.jobType,
      priority: dto.priority || queue.defaultPriority,
      status: dto.scheduledFor
        ? AiQueueJobStatus.DELAYED
        : AiQueueJobStatus.WAITING,
      jobData: dto.jobData,
      jobOptions: dto.jobOptions || null,
      idempotencyKey: dto.idempotencyKey,
      scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
      maxRetries: dto.maxRetries ?? queue.defaultRetries,
      timeout: dto.timeout ?? queue.defaultTimeout,
      modelProvider: dto.modelProvider,
      modelName: dto.modelName,
      capability: dto.capability,
      metadata: dto.metadata || {},
    };

    const job = (await this.repository.createQueueJob(jobData)) as IAiQueueJob;

    await this.eventQueue.publish({
      event: AiQueueEvent.JOB_ENQUEUED,
      queueId: queue.id,
      queueJobId: job.id,
      workspaceId: dto.workspaceId,
    });

    if (queue.status === AiQueueStatus.ACTIVE && !dto.scheduledFor) {
      this.startProcessing(queue.id);
    }

    return {
      jobId: job.id,
      queueId: job.queueId,
      status: job.status,
      priority: job.priority,
    };
  }

  async enqueueBatch(dto: EnqueueBatchDto): Promise<IEnqueueJobResult[]> {
    const queue = await this.findQueueByName(dto.queueName);
    const batchId = dto.batchId || `batch-${Date.now()}`;

    const results: IEnqueueJobResult[] = [];

    await this.eventQueue.publish({
      event: AiQueueEvent.BATCH_STARTED,
      queueId: queue.id,
      batchId,
      workspaceId: dto.workspaceId,
    });

    for (const jobItem of dto.jobs) {
      const result = await this.enqueueJob({
        queueName: dto.queueName,
        workspaceId: dto.workspaceId,
        jobType: jobItem.jobType,
        jobData: jobItem.jobData,
        priority: jobItem.priority as any,
        scheduledFor: jobItem.scheduledFor,
        metadata: { batchId },
      });

      results.push(result);
    }

    await this.eventQueue.publish({
      event: AiQueueEvent.BATCH_COMPLETED,
      queueId: queue.id,
      batchId,
      workspaceId: dto.workspaceId,
    });

    return results;
  }

  private startProcessing(queueId: string): void {
    if (this.processingQueues.get(queueId)) {
      return;
    }

    this.processingQueues.set(queueId, true);
    this.processQueue(queueId).catch((error) => {
      this.logger.error(`Error processing queue ${queueId}:`, error);
      this.processingQueues.delete(queueId);
    });
  }

  private async processQueue(queueId: string): Promise<void> {
    const queue = await this.repository.findQueueById(queueId);

    if (!queue || queue.status !== AiQueueStatus.ACTIVE) {
      this.processingQueues.delete(queueId);
      return;
    }

    const jobs = await this.repository.findNextJobsToProcess(
      queueId,
      queue.concurrency,
    );

    if (jobs.length === 0) {
      this.processingQueues.delete(queueId);
      return;
    }

    const processingPromises = jobs.map((job) =>
      this.processJob(queue, job).catch((error) => {
        this.logger.error(`Error processing job ${job.id}:`, error);
      }),
    );

    await Promise.all(processingPromises);

    if (this.processingQueues.get(queueId)) {
      setTimeout(() => this.processQueue(queueId), 1000);
    }
  }

  private async processJob(
    queue: IAiQueue,
    job: IAiQueueJob,
  ): Promise<IJobProcessingResult> {
    const startTime = Date.now();

    await this.repository.updateQueueJob(job.id, {
      status: AiQueueJobStatus.ACTIVE,
      startedAt: new Date(),
      attemptNumber: job.attemptNumber + 1,
    });

    await this.eventQueue.publish({
      event: AiQueueEvent.JOB_STARTED,
      queueId: queue.id,
      queueJobId: job.id,
      workspaceId: job.workspaceId,
    });

    try {
      const result = await this.executeJob(job);

      const processingTime = Date.now() - startTime;

      await this.repository.updateQueueJob(job.id, {
        status: AiQueueJobStatus.COMPLETED,
        completedAt: new Date(),
        result: result.result,
        processingTime,
        cost: result.cost,
        tokens: result.tokens,
      });

      await this.eventQueue.publish({
        event: AiQueueEvent.JOB_COMPLETED,
        queueId: queue.id,
        queueJobId: job.id,
        workspaceId: job.workspaceId,
        status: 'completed',
      });

      await this.updateMetrics(queue.id);

      return {
        jobId: job.id,
        status: AiQueueJobStatus.COMPLETED,
        result: result.result,
        processingTime,
        cost: result.cost,
        tokens: result.tokens,
      };
    } catch (error) {
      await this.handleJobFailure(queue, job, error as Error);
      throw error;
    }
  }

  private async executeJob(job: IAiQueueJob): Promise<{
    result?: unknown;
    cost?: number;
    tokens?: number;
  }> {
    const jobData = job.jobData as any;

    switch (job.jobType) {
      case 'workflow':
        const workflowResult = await this.workflowService.executeWorkflow({
          workspaceId: job.workspaceId,
          workflowId: jobData.workflowId,
          input: jobData.input,
          triggeredBy: 'queue',
        });

        await this.repository.updateQueueJob(job.id, {
          workflowExecutionId: workflowResult.executionId,
        });

        return {
          result: workflowResult,
          cost: workflowResult.totalCost,
          tokens: workflowResult.totalTokens,
        };

      case 'agent':
        const agentResult = await this.agentService.executeAgent({
          workspaceId: job.workspaceId,
          agentId: jobData.agentId,
          input: jobData.input || '',
          context: jobData.context,
        });

        await this.repository.updateQueueJob(job.id, {
          agentExecutionId: agentResult.executionId,
        });

        return {
          result: agentResult.output,
          cost: agentResult.totalCost,
          tokens: agentResult.totalTokens,
        };

      case 'job':
        const jobResult = await this.jobSchedulerService.executeJob({
          workspaceId: job.workspaceId,
          jobId: jobData.jobId,
          input: jobData.input,
        });

        await this.repository.updateQueueJob(job.id, {
          jobExecutionId: jobResult.executionId,
        });

        return {
          result: jobResult.output,
          cost: jobResult.cost,
          tokens: jobResult.tokens,
        };

      default:
        return { result: { executed: true } };
    }
  }

  private async handleJobFailure(
    queue: IAiQueue,
    job: IAiQueueJob,
    error: Error,
  ): Promise<void> {
    await this.repository.updateQueueJob(job.id, {
      status: AiQueueJobStatus.FAILED,
      failedAt: new Date(),
      error: {
        code: (error as any).code || 'JOB_ERROR',
        message: error.message,
        stack: error.stack,
      },
    });

    await this.repository.createFailure({
      queueJobId: job.id,
      queueId: job.queueId,
      workspaceId: job.workspaceId,
      attemptNumber: job.attemptNumber + 1,
      errorCode: (error as any).code || 'JOB_ERROR',
      errorMessage: error.message,
      errorStack: error.stack,
      failedAt: new Date(),
    });

    await this.eventQueue.publish({
      event: AiQueueEvent.JOB_FAILED,
      queueId: queue.id,
      queueJobId: job.id,
      workspaceId: job.workspaceId,
      status: 'failed',
    });

    if (job.attemptNumber + 1 < job.maxRetries) {
      await this.retryJob(queue, job);
    } else if (queue.enableDeadLetter) {
      await this.moveToDeadLetter(queue, job, 'Max retries exceeded');
    }
  }

  private async retryJob(queue: IAiQueue, job: IAiQueueJob): Promise<void> {
    const delay = this.calculateRetryDelay(queue, job);

    await this.repository.updateQueueJob(job.id, {
      status: AiQueueJobStatus.DELAYED,
      scheduledFor: new Date(Date.now() + delay),
    });

    await this.eventQueue.publish({
      event: AiQueueEvent.JOB_RETRYING,
      queueId: queue.id,
      queueJobId: job.id,
      workspaceId: job.workspaceId,
    });
  }

  private calculateRetryDelay(queue: IAiQueue, job: IAiQueueJob): number {
    const backoff = queue.retryBackoff as IRetryBackoffConfig | null;

    if (!backoff) {
      return 5000;
    }

    const attemptNumber = job.attemptNumber + 1;

    switch (backoff.type) {
      case 'fixed':
        return backoff.initialDelay;

      case 'exponential':
        const multiplier = backoff.multiplier || 2;
        const delay = backoff.initialDelay * Math.pow(multiplier, attemptNumber);
        return Math.min(delay, backoff.maxDelay);

      case 'linear':
        const linearDelay = backoff.initialDelay * attemptNumber;
        return Math.min(linearDelay, backoff.maxDelay);

      default:
        return backoff.initialDelay;
    }
  }

  private async moveToDeadLetter(
    queue: IAiQueue,
    job: IAiQueueJob,
    reason: string,
  ): Promise<void> {
    await this.repository.createFailure({
      queueJobId: job.id,
      queueId: job.queueId,
      workspaceId: job.workspaceId,
      attemptNumber: job.attemptNumber,
      errorCode: 'DEAD_LETTER',
      errorMessage: reason,
      failedAt: new Date(),
      movedToDeadLetter: true,
      deadLetterReason: reason,
    });

    await this.eventQueue.publish({
      event: AiQueueEvent.JOB_DEAD_LETTER,
      queueId: queue.id,
      queueJobId: job.id,
      workspaceId: job.workspaceId,
    });
  }

  private async updateMetrics(queueId: string): Promise<void> {
    const counts = await this.repository.getQueueJobCounts(queueId);
    const stats = await this.repository.getQueueStats(queueId);

    const metrics = {
      queueId,
      workspaceId: null,
      timestamp: new Date(),
      waitingJobs: counts.waiting,
      activeJobs: counts.active,
      completedJobs: counts.completed,
      failedJobs: counts.failed,
      delayedJobs: counts.delayed,
      totalProcessed: stats.totalProcessed,
      totalFailed: stats.failedJobs,
      avgProcessingTime: stats.avgProcessingTime,
      totalCost: stats.totalCost,
      totalTokens: stats.totalTokens,
      metadata: {},
    };

    await this.repository.createMetrics(metrics);

    await this.eventQueue.publish({
      event: AiQueueEvent.METRICS_UPDATED,
      queueId,
    });
  }

  async cancelJob(id: string, workspaceId: string): Promise<IAiQueueJob> {
    const job = await this.repository.findQueueJobById(id);

    if (!job || job.workspaceId !== workspaceId) {
      throw new ResourceNotFoundException(
        'Job not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    if (
      job.status === AiQueueJobStatus.COMPLETED ||
      job.status === AiQueueJobStatus.CANCELLED
    ) {
      throw new BusinessRuleException(
        'Cannot cancel job in current status',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const cancelled = await this.repository.updateQueueJob(id, {
      status: AiQueueJobStatus.CANCELLED,
    });

    await this.eventQueue.publish({
      event: AiQueueEvent.JOB_CANCELLED,
      queueId: job.queueId,
      queueJobId: id,
      workspaceId,
    });

    return cancelled as IAiQueueJob;
  }

  async findJobById(id: string, workspaceId: string): Promise<IAiQueueJob> {
    const job = await this.repository.findQueueJobById(id);

    if (!job || job.workspaceId !== workspaceId) {
      throw new ResourceNotFoundException(
        'Job not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    return job;
  }

  async findAllJobs(
    filter: QueueJobFilterDto,
  ): Promise<PaginatedQueueJobResponseDto> {
    const [data, total] = await this.repository.findAllQueueJobs(filter);

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data as QueueJobResponseDto[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getQueueStats(queueId: string): Promise<IQueueStatsResult> {
    const queue = await this.findQueueById(queueId);
    const counts = await this.repository.getQueueJobCounts(queueId);
    const stats = await this.repository.getQueueStats(queueId);

    return {
      queueId: queue.id,
      status: queue.status,
      waiting: counts.waiting,
      active: counts.active,
      completed: counts.completed,
      failed: counts.failed,
      delayed: counts.delayed,
      totalProcessed: stats.totalProcessed,
      totalFailed: stats.failedJobs,
      avgProcessingTime: stats.avgProcessingTime,
      totalCost: stats.totalCost,
      totalTokens: stats.totalTokens,
    };
  }
}
