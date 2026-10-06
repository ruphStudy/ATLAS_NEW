import { Injectable, Logger } from '@nestjs/common';
import { AiJobSchedulerRepository } from './ai-job-scheduler.repository';
import { AiJobEventQueue } from './jobs';
import { AiWorkflowService } from '@modules/ai-workflow/ai-workflow.service';
import { AiAgentService } from '@modules/ai-agent/ai-agent.service';
import {
  CreateAiJobDto,
  UpdateAiJobDto,
  AiJobFilterDto,
  ExecuteJobDto,
  ExecutionFilterDto,
  CreateJobDependencyDto,
  AiJobResponseDto,
  PaginatedAiJobResponseDto,
  JobExecutionResponseDto,
  PaginatedExecutionResponseDto,
  ExecutionResultDto,
} from './dto';
import {
  IAiJob,
  IAiJobExecution,
  IAiJobDependency,
  AiJobStatus,
  AiJobType,
  AiJobTaskType,
  AiJobEvent,
  IJobExecutionResult,
  ITaskConfig,
  IRetryBackoff,
} from './interfaces';
import { ResourceNotFoundException } from '@common/exceptions/resource-not-found.exception';
import { BusinessRuleException } from '@common/exceptions/business-rule.exception';
import { DuplicateResourceException } from '@common/exceptions/duplicate-resource.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class AiJobSchedulerService {
  private readonly logger = new Logger(AiJobSchedulerService.name);

  constructor(
    private readonly repository: AiJobSchedulerRepository,
    private readonly eventQueue: AiJobEventQueue,
    private readonly workflowService: AiWorkflowService,
    private readonly agentService: AiAgentService,
  ) {}

  async createJob(dto: CreateAiJobDto): Promise<IAiJob> {
    const existingByKey = await this.repository.findJobByKey(
      dto.key,
      dto.workspaceId,
    );

    if (existingByKey) {
      throw new DuplicateResourceException(
        'Job with this key already exists',
        ErrorCode.DUPLICATE_RESOURCE,
      );
    }

    if (dto.idempotencyKey) {
      const existingByIdempotency = await this.repository.findJobByIdempotencyKey(
        dto.idempotencyKey,
        dto.workspaceId,
      );

      if (existingByIdempotency) {
        return existingByIdempotency;
      }
    }

    const data = {
      workspaceId: dto.workspaceId,
      key: dto.key,
      name: dto.name,
      description: dto.description,
      type: dto.type,
      taskType: dto.taskType,
      priority: dto.priority || 'NORMAL',
      status: AiJobStatus.PENDING,
      taskConfig: dto.taskConfig,
      scheduleConfig: dto.scheduleConfig || null,
      timeout: dto.timeout,
      maxRetries: dto.maxRetries ?? 3,
      retryBackoff: dto.retryBackoff || null,
      concurrencyLimit: dto.concurrencyLimit,
      idempotencyKey: dto.idempotencyKey,
      startAfter: dto.startAfter ? new Date(dto.startAfter) : null,
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      tags: dto.tags || [],
      metadata: dto.metadata || {},
      createdBy: dto.createdBy,
    };

    const job = (await this.repository.createJob(data)) as IAiJob;

    await this.eventQueue.publish({
      event: AiJobEvent.JOB_CREATED,
      workspaceId: job.workspaceId,
      jobId: job.id,
    });

    if (job.type !== AiJobType.ONE_TIME) {
      await this.scheduleJob(job);
    }

    return job;
  }

  async updateJob(
    id: string,
    workspaceId: string,
    dto: UpdateAiJobDto,
  ): Promise<IAiJob> {
    await this.findJobById(id, workspaceId);

    const updated = (await this.repository.updateJob(id, dto)) as IAiJob;

    await this.eventQueue.publish({
      event: AiJobEvent.JOB_UPDATED,
      workspaceId: updated.workspaceId,
      jobId: updated.id,
    });

    return updated;
  }

  async scheduleJob(job: IAiJob): Promise<void> {
    const nextExecutionAt = this.calculateNextExecution(job);

    await this.repository.updateJob(job.id, {
      nextExecutionAt,
    });

    await this.eventQueue.publish({
      event: AiJobEvent.JOB_SCHEDULED,
      workspaceId: job.workspaceId,
      jobId: job.id,
    });
  }

  private calculateNextExecution(job: IAiJob): Date | null {
    const now = new Date();

    switch (job.type) {
      case AiJobType.DELAYED:
        if (job.startAfter) {
          return new Date(job.startAfter);
        }
        return null;

      case AiJobType.RECURRING:
        const interval = (job.scheduleConfig as any)?.interval || 3600000;
        return new Date(now.getTime() + interval);

      case AiJobType.CRON:
        return null;

      default:
        return null;
    }
  }

  async pauseJob(id: string, workspaceId: string): Promise<IAiJob> {
    const job = await this.findJobById(id, workspaceId);

    const paused = await this.repository.updateJob(id, {
      status: AiJobStatus.PAUSED,
    });

    await this.eventQueue.publish({
      event: AiJobEvent.JOB_PAUSED,
      workspaceId: paused.workspaceId,
      jobId: paused.id,
    });

    return paused as IAiJob;
  }

  async resumeJob(id: string, workspaceId: string): Promise<IAiJob> {
    const job = await this.findJobById(id, workspaceId);

    const resumed = await this.repository.updateJob(id, {
      status: AiJobStatus.PENDING,
    });

    await this.eventQueue.publish({
      event: AiJobEvent.JOB_RESUMED,
      workspaceId: resumed.workspaceId,
      jobId: resumed.id,
    });

    return resumed as IAiJob;
  }

  async archiveJob(id: string, workspaceId: string): Promise<IAiJob> {
    const job = await this.findJobById(id, workspaceId);

    await this.repository.deleteJob(id);

    await this.eventQueue.publish({
      event: AiJobEvent.JOB_ARCHIVED,
      workspaceId: job.workspaceId,
      jobId: job.id,
    });

    return job;
  }

  async deleteJob(id: string, workspaceId: string): Promise<void> {
    await this.findJobById(id, workspaceId);
    await this.repository.deleteJob(id);
  }

  async findJobById(id: string, workspaceId: string): Promise<IAiJob> {
    const job = await this.repository.findJobById(id, workspaceId);
    if (!job) {
      throw new ResourceNotFoundException(
        'Job not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return job;
  }

  async findAllJobs(
    filter: AiJobFilterDto,
  ): Promise<PaginatedAiJobResponseDto> {
    const [data, total] = await this.repository.findAllJobs(filter);

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data as AiJobResponseDto[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  async executeJob(dto: ExecuteJobDto): Promise<IJobExecutionResult> {
    const job = await this.findJobById(dto.jobId, dto.workspaceId);

    if (job.status === AiJobStatus.PAUSED) {
      throw new BusinessRuleException(
        'Job is paused',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const dependencies = await this.repository.findDependenciesByJobId(job.id);
    if (dependencies.length > 0) {
      const allDependenciesCompleted = await this.checkDependencies(dependencies);
      if (!allDependenciesCompleted) {
        throw new BusinessRuleException(
          'Job dependencies not satisfied',
          ErrorCode.BUSINESS_RULE_VIOLATION,
        );
      }
    }

    const execution = await this.repository.createExecution({
      jobId: job.id,
      workspaceId: dto.workspaceId,
      status: AiJobStatus.QUEUED,
      attemptNumber: 1,
      input: dto.input || null,
      metadata: dto.metadata || {},
    });

    await this.repository.incrementExecutionCount(job.id);

    await this.eventQueue.publish({
      event: AiJobEvent.JOB_QUEUED,
      workspaceId: dto.workspaceId,
      jobId: dto.jobId,
      executionId: execution.id,
    });

    try {
      const result = await this.processExecution(job, execution);
      return result;
    } catch (error) {
      await this.handleExecutionFailure(job, execution, error as Error);
      throw error;
    }
  }

  private async checkDependencies(dependencies: IAiJobDependency[]): Promise<boolean> {
    for (const dep of dependencies) {
      const depJob = await this.repository.findJobById(
        dep.dependsOnJobId,
        dep.workspaceId,
      );

      if (!depJob || depJob.successCount === 0) {
        return false;
      }
    }

    return true;
  }

  private async processExecution(
    job: IAiJob,
    execution: IAiJobExecution,
  ): Promise<IJobExecutionResult> {
    const startTime = Date.now();

    await this.repository.updateExecution(execution.id, {
      status: AiJobStatus.RUNNING,
      startTime: new Date(),
    });

    await this.eventQueue.publish({
      event: AiJobEvent.JOB_STARTED,
      workspaceId: execution.workspaceId,
      jobId: job.id,
      executionId: execution.id,
    });

    let output: unknown;
    let cost = 0;
    let tokens = 0;

    const taskConfig = job.taskConfig as ITaskConfig;

    switch (job.taskType) {
      case AiJobTaskType.WORKFLOW:
        const workflowResult = await this.workflowService.executeWorkflow({
          workspaceId: job.workspaceId,
          workflowId: taskConfig.workflowId!,
          input: taskConfig.input || execution.input,
          triggeredBy: 'job-scheduler',
        });
        output = workflowResult;
        cost = workflowResult.totalCost || 0;
        tokens = workflowResult.totalTokens || 0;

        await this.repository.updateExecution(execution.id, {
          workflowExecutionId: workflowResult.executionId,
        });
        break;

      case AiJobTaskType.AGENT:
        const agentResult = await this.agentService.executeAgent({
          workspaceId: job.workspaceId,
          agentId: taskConfig.agentId!,
          input: taskConfig.input || execution.input || '',
          context: taskConfig.context,
        });
        output = agentResult.output;
        cost = agentResult.totalCost;
        tokens = agentResult.totalTokens;

        await this.repository.updateExecution(execution.id, {
          agentExecutionId: agentResult.id,
        });
        break;

      case AiJobTaskType.BUSINESS_TASK:
        output = { executed: true };
        break;
    }

    const duration = Date.now() - startTime;

    await this.repository.updateExecution(execution.id, {
      status: AiJobStatus.COMPLETED,
      output,
      endTime: new Date(),
      cost,
      tokens,
    });

    await this.repository.incrementSuccessCount(job.id);

    await this.eventQueue.publish({
      event: AiJobEvent.JOB_COMPLETED,
      workspaceId: execution.workspaceId,
      jobId: job.id,
      executionId: execution.id,
      status: 'completed',
    });

    if (job.type === AiJobType.RECURRING || job.type === AiJobType.CRON) {
      await this.scheduleJob(job);
    }

    return {
      executionId: execution.id,
      status: AiJobStatus.COMPLETED,
      output,
      cost,
      tokens,
      duration,
      metadata: {},
    };
  }

  private async handleExecutionFailure(
    job: IAiJob,
    execution: IAiJobExecution,
    error: Error,
  ): Promise<void> {
    await this.repository.updateExecution(execution.id, {
      status: AiJobStatus.FAILED,
      endTime: new Date(),
      errorCode: (error as any).code || 'EXECUTION_ERROR',
      errorMessage: error.message,
      errorStack: error.stack,
    });

    await this.repository.incrementFailureCount(job.id);

    await this.eventQueue.publish({
      event: AiJobEvent.JOB_FAILED,
      workspaceId: execution.workspaceId,
      jobId: job.id,
      executionId: execution.id,
      status: 'failed',
    });

    if (execution.attemptNumber < job.maxRetries) {
      await this.retryExecution(job, execution);
    }
  }

  private async retryExecution(
    job: IAiJob,
    execution: IAiJobExecution,
  ): Promise<void> {
    const nextAttempt = execution.attemptNumber + 1;
    const delay = this.calculateRetryDelay(job, nextAttempt);

    await this.eventQueue.publish({
      event: AiJobEvent.JOB_RETRYING,
      workspaceId: execution.workspaceId,
      jobId: job.id,
      executionId: execution.id,
    });

    await this.repository.updateJob(job.id, {
      status: AiJobStatus.RETRYING,
      startAfter: new Date(Date.now() + delay),
    });
  }

  private calculateRetryDelay(job: IAiJob, attemptNumber: number): number {
    const backoff = job.retryBackoff as IRetryBackoff | null;

    if (!backoff) {
      return 5000;
    }

    switch (backoff.type) {
      case 'fixed':
        return backoff.initialDelay;

      case 'exponential':
        const multiplier = backoff.multiplier || 2;
        const delay = backoff.initialDelay * Math.pow(multiplier, attemptNumber - 1);
        return Math.min(delay, backoff.maxDelay);

      case 'linear':
        const linearDelay = backoff.initialDelay * attemptNumber;
        return Math.min(linearDelay, backoff.maxDelay);

      default:
        return backoff.initialDelay;
    }
  }

  async cancelExecution(id: string, workspaceId: string): Promise<IAiJobExecution> {
    const execution = await this.repository.findExecutionById(id);

    if (!execution || execution.workspaceId !== workspaceId) {
      throw new ResourceNotFoundException(
        'Execution not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    if (
      execution.status === AiJobStatus.COMPLETED ||
      execution.status === AiJobStatus.FAILED ||
      execution.status === AiJobStatus.CANCELLED
    ) {
      throw new BusinessRuleException(
        'Cannot cancel execution in current status',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const cancelled = await this.repository.updateExecution(id, {
      status: AiJobStatus.CANCELLED,
      endTime: new Date(),
    });

    await this.eventQueue.publish({
      event: AiJobEvent.JOB_CANCELLED,
      workspaceId,
      executionId: id,
    });

    return cancelled as IAiJobExecution;
  }

  async findExecutionById(
    id: string,
    workspaceId: string,
  ): Promise<IAiJobExecution> {
    const execution = await this.repository.findExecutionById(id);

    if (!execution || execution.workspaceId !== workspaceId) {
      throw new ResourceNotFoundException(
        'Execution not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    return execution;
  }

  async findAllExecutions(
    filter: ExecutionFilterDto,
  ): Promise<PaginatedExecutionResponseDto> {
    const [data, total] = await this.repository.findAllExecutions(filter);

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data as JobExecutionResponseDto[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  async createDependency(dto: CreateJobDependencyDto): Promise<IAiJobDependency[]> {
    await this.findJobById(dto.jobId, dto.workspaceId);

    const dependencies: IAiJobDependency[] = [];

    for (const dependsOnJobId of dto.dependsOnJobIds) {
      await this.findJobById(dependsOnJobId, dto.workspaceId);

      const dependency = await this.repository.createDependency({
        jobId: dto.jobId,
        dependsOnJobId,
        workspaceId: dto.workspaceId,
        type: 'COMPLETION',
      });

      dependencies.push(dependency);
    }

    return dependencies;
  }

  async getJobStats(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    return this.repository.getJobStats(workspaceId, startDate, endDate);
  }
}
