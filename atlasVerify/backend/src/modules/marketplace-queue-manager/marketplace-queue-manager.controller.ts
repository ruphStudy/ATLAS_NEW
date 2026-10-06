import { Controller, Get, Post, Query, Body, Param } from '@nestjs/common';
import { MarketplaceQueueManagerService } from './marketplace-queue-manager.service';
import {
  AddJobRequestDto,
  AddBulkJobsRequestDto,
  RetryJobRequestDto,
  CancelJobRequestDto,
  RecoverStaleJobsRequestDto,
  ListJobsQueryDto,
  GetJobQueryDto,
  PauseQueueRequestDto,
  ResumeQueueRequestDto,
  DrainQueueRequestDto,
  CleanQueueRequestDto,
  GetErrorSummaryQueryDto,
  RateLimitConfigDto,
  ReprocessDeadLetterJobRequestDto,
  JobInfoResponseDto,
  QueueMetricsResponseDto,
  QueueHealthResponseDto,
  QueueOperationResponseDto,
  AggregatedMetricsResponseDto,
  ErrorSummaryResponseDto,
  JobHistoryResponseDto,
} from './dto';
import { QueueType } from './interfaces';

@Controller('marketplace/queue-manager')
export class MarketplaceQueueManagerController {
  constructor(
    private readonly queueManagerService: MarketplaceQueueManagerService,
  ) {}

  @Post('jobs/add')
  async addJob(
    @Body() dto: AddJobRequestDto,
  ): Promise<QueueOperationResponseDto> {
    return this.queueManagerService.addJob(
      dto.queueType,
      {
        workspaceId: dto.workspaceId,
        provider: dto.provider,
        accountId: dto.accountId,
        type: dto.type,
        data: dto.data,
        metadata: dto.metadata,
      },
      dto.options,
    );
  }

  @Post('jobs/add-bulk')
  async addBulkJobs(
    @Body() dto: AddBulkJobsRequestDto,
  ): Promise<QueueOperationResponseDto> {
    return this.queueManagerService.addBulkJobs({
      workspaceId: dto.workspaceId,
      provider: dto.provider,
      accountId: dto.accountId,
      queueType: dto.queueType,
      jobs: dto.jobs,
    });
  }

  @Get('jobs')
  async listJobs(@Query() query: ListJobsQueryDto): Promise<JobInfoResponseDto[]> {
    return this.queueManagerService.listJobs(
      query.workspaceId,
      query.queueType,
      query.state,
    );
  }

  @Get('jobs/detail')
  async getJob(@Query() query: GetJobQueryDto): Promise<JobInfoResponseDto | null> {
    return this.queueManagerService.getJob(
      query.workspaceId,
      query.queueType,
      query.jobId,
    );
  }

  @Get('jobs/history/:workspaceId/:jobId')
  async getJobHistory(
    @Param('workspaceId') workspaceId: string,
    @Param('jobId') jobId: string,
  ): Promise<JobHistoryResponseDto[]> {
    return this.queueManagerService.getJobHistory(workspaceId, jobId);
  }

  @Post('jobs/retry')
  async retryJob(
    @Body() dto: RetryJobRequestDto,
  ): Promise<QueueOperationResponseDto> {
    return this.queueManagerService.retryJob({
      workspaceId: dto.workspaceId,
      queueType: dto.queueType,
      jobId: dto.jobId,
      resetAttempts: dto.resetAttempts,
      priority: dto.priority,
    });
  }

  @Post('jobs/cancel')
  async cancelJob(
    @Body() dto: CancelJobRequestDto,
  ): Promise<QueueOperationResponseDto> {
    return this.queueManagerService.cancelJob({
      workspaceId: dto.workspaceId,
      queueType: dto.queueType,
      jobId: dto.jobId,
      reason: dto.reason,
      removeFromQueue: dto.removeFromQueue,
    });
  }

  @Post('jobs/recover-stale')
  async recoverStaleJobs(
    @Body() dto: RecoverStaleJobsRequestDto,
  ): Promise<QueueOperationResponseDto> {
    return this.queueManagerService.recoverStaleJobs({
      queueType: dto.queueType,
      workspaceId: dto.workspaceId,
      olderThanMinutes: dto.olderThanMinutes,
    });
  }

  @Post('queues/pause')
  async pauseQueue(
    @Body() dto: PauseQueueRequestDto,
  ): Promise<QueueOperationResponseDto> {
    return this.queueManagerService.pauseQueue(dto.queueType);
  }

  @Post('queues/resume')
  async resumeQueue(
    @Body() dto: ResumeQueueRequestDto,
  ): Promise<QueueOperationResponseDto> {
    return this.queueManagerService.resumeQueue(dto.queueType);
  }

  @Post('queues/drain')
  async drainQueue(
    @Body() dto: DrainQueueRequestDto,
  ): Promise<QueueOperationResponseDto> {
    return this.queueManagerService.drainQueue(dto.queueType, dto.delayed);
  }

  @Post('queues/clean')
  async cleanQueue(
    @Body() dto: CleanQueueRequestDto,
  ): Promise<QueueOperationResponseDto> {
    return this.queueManagerService.cleanQueue(
      dto.queueType,
      dto.grace,
      dto.limit,
      dto.type,
    );
  }

  @Get('queues/metrics/:queueType')
  async getQueueMetrics(
    @Param('queueType') queueType: string,
  ): Promise<QueueMetricsResponseDto | null> {
    return this.queueManagerService.getQueueMetrics(queueType as QueueType);
  }

  @Get('queues/health/:queueType')
  async getQueueHealth(
    @Param('queueType') queueType: string,
  ): Promise<QueueHealthResponseDto | null> {
    return this.queueManagerService.getQueueHealth(queueType as QueueType);
  }

  @Get('queues/metrics')
  async getAllQueueMetrics(): Promise<QueueMetricsResponseDto[]> {
    return this.queueManagerService.getAllQueueMetrics();
  }

  @Get('metrics/:workspaceId/:queueType')
  async getAggregatedMetrics(
    @Param('workspaceId') workspaceId: string,
    @Param('queueType') queueType: string,
  ): Promise<AggregatedMetricsResponseDto> {
    return this.queueManagerService.getAggregatedMetrics(
      workspaceId,
      queueType as QueueType,
    );
  }

  @Get('metrics/:workspaceId')
  async getAllAggregatedMetrics(
    @Param('workspaceId') workspaceId: string,
  ): Promise<AggregatedMetricsResponseDto[]> {
    return this.queueManagerService.getAllAggregatedMetrics(workspaceId);
  }

  @Get('errors')
  async getErrorSummary(
    @Query() query: GetErrorSummaryQueryDto,
  ): Promise<ErrorSummaryResponseDto[]> {
    return this.queueManagerService.getErrorSummary(
      query.workspaceId,
      query.queueType,
      new Date(query.startDate),
      new Date(query.endDate),
    );
  }

  @Get('dead-letter/:workspaceId')
  async getDeadLetterJobs(
    @Param('workspaceId') workspaceId: string,
    @Query('queueType') queueType?: string,
  ): Promise<any[]> {
    return this.queueManagerService.getDeadLetterJobs(
      workspaceId,
      queueType as QueueType,
    );
  }

  @Post('dead-letter/reprocess')
  async reprocessDeadLetterJob(
    @Body() dto: ReprocessDeadLetterJobRequestDto,
  ): Promise<QueueOperationResponseDto> {
    return this.queueManagerService.reprocessDeadLetterJob(
      dto.workspaceId,
      dto.deadLetterJobId,
      dto.options,
    );
  }

  @Get('rate-limit/:workspaceId/:provider/:queueType')
  async getRateLimitConfig(
    @Param('workspaceId') workspaceId: string,
    @Param('provider') provider: string,
    @Param('queueType') queueType: string,
    @Query('accountId') accountId?: string,
  ): Promise<any> {
    return this.queueManagerService.getRateLimitConfig(
      workspaceId,
      provider,
      accountId,
      queueType as QueueType,
    );
  }

  @Post('rate-limit/create')
  async createRateLimitConfig(@Body() dto: RateLimitConfigDto): Promise<any> {
    return this.queueManagerService.createRateLimitConfig({
      workspaceId: dto.workspaceId,
      provider: dto.provider,
      accountId: dto.accountId,
      queueType: dto.queueType,
      maxConcurrent: dto.maxConcurrent,
      maxPerMinute: dto.maxPerMinute,
      maxPerHour: dto.maxPerHour,
      isEnabled: dto.isEnabled,
    });
  }

  @Post('rate-limit/update')
  async updateRateLimitConfig(@Body() dto: RateLimitConfigDto): Promise<any> {
    return this.queueManagerService.updateRateLimitConfig(
      dto.workspaceId,
      dto.provider,
      dto.accountId,
      dto.queueType,
      {
        maxConcurrent: dto.maxConcurrent,
        maxPerMinute: dto.maxPerMinute,
        maxPerHour: dto.maxPerHour,
        isEnabled: dto.isEnabled,
      },
    );
  }
}
