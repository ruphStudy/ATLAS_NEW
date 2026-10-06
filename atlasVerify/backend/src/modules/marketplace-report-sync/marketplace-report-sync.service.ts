import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { MarketplaceProviderFactory } from '../marketplace-provider-factory/marketplace-provider-factory.service';
import { MarketplaceCapability } from '../marketplace-provider/interfaces/marketplace-provider.interface';
import { ReportSyncRepository } from './repository/report-sync.repository';
import { ReportSyncValidator } from './validator/report-sync.validator';
import { ReportSyncStateManager } from './state/report-sync-state.manager';
import { ReportSyncEventQueue } from './events/report-sync-events.queue';
import { ReportSyncQueue } from './queue/report-sync.queue';
import { ReportSyncRunner } from './runner/report-sync.runner';
import { ReportSyncMetrics } from './metrics/report-sync.metrics';
import {
  StartReportSyncRequestDto,
  RetryFailedReportItemsRequestDto,
  CreateReportScheduleRequestDto,
  UpdateReportScheduleRequestDto,
  ReportSyncJobFilterQueryDto,
  ItemResultFilterQueryDto,
  ExternalRefFilterQueryDto,
  ReportDocumentFilterQueryDto,
} from './dto';
import { ReportSyncEvent, ItemSyncStatus } from './interfaces';

@Injectable()
export class MarketplaceReportSyncService {
  constructor(
    private readonly providerFactory: MarketplaceProviderFactory,
    private readonly repository: ReportSyncRepository,
    private readonly validator: ReportSyncValidator,
    private readonly stateManager: ReportSyncStateManager,
    private readonly eventQueue: ReportSyncEventQueue,
    private readonly syncQueue: ReportSyncQueue,
    private readonly runner: ReportSyncRunner,
    private readonly metrics: ReportSyncMetrics,
  ) {}

  async startSync(dto: StartReportSyncRequestDto) {
    this.validator.validateSyncRequest(dto);

    const provider = await this.providerFactory.getProvider(dto.providerKey, dto.marketplaceKey);
    if (!provider.hasCapability(MarketplaceCapability.SYNC_REPORTS)) {
      throw new BadRequestException(
        `Provider ${dto.providerKey}/${dto.marketplaceKey} does not support report sync`,
      );
    }

    const isLocked = await this.stateManager.isJobLocked(dto.workspaceId, dto.accountId);
    if (isLocked) {
      throw new BadRequestException('Another sync job is currently running for this account');
    }

    const job = await this.repository.createJob({
      workspaceId: dto.workspaceId,
      accountId: dto.accountId,
      providerKey: dto.providerKey,
      marketplaceKey: dto.marketplaceKey,
      reportType: dto.reportType,
      mode: dto.mode,
      startDate: dto.startDate,
      endDate: dto.endDate,
      metadata: dto.metadata,
    });

    await this.syncQueue.enqueue({
      jobId: job.id,
      workspaceId: job.workspaceId,
      accountId: job.accountId,
      providerKey: job.providerKey,
      marketplaceKey: job.marketplaceKey,
      reportType: job.reportType,
      mode: job.mode,
      startDate: dto.startDate,
      endDate: dto.endDate,
      cursor: dto.cursor,
      metadata: dto.metadata,
    });

    await this.eventQueue.publish({
      event: ReportSyncEvent.SYNC_STARTED,
      workspaceId: job.workspaceId,
      accountId: job.accountId,
      jobId: job.id,
    });

    return job;
  }

  async cancelSync(jobId: string, workspaceId: string) {
    const job = await this.repository.getJob(jobId, workspaceId);
    if (!job) {
      throw new NotFoundException('Sync job not found');
    }

    await this.stateManager.cancelJob(jobId, workspaceId);
    await this.syncQueue.cancel(jobId);

    await this.eventQueue.publish({
      event: ReportSyncEvent.SYNC_CANCELLED,
      workspaceId,
      accountId: job.accountId,
      jobId,
    });

    return this.repository.getJob(jobId, workspaceId);
  }

  async retryFailedItems(dto: RetryFailedReportItemsRequestDto) {
    const originalJob = await this.repository.getJob(dto.originalJobId, dto.workspaceId);
    if (!originalJob) {
      throw new NotFoundException('Original job not found');
    }

    const failedItems = await this.repository.getItemResults(dto.originalJobId, dto.workspaceId, {
      status: ItemSyncStatus.FAILED,
      limit: 1000,
    });

    if (failedItems.items.length === 0) {
      throw new BadRequestException('No failed items to retry');
    }

    const job = await this.repository.createJob({
      workspaceId: dto.workspaceId,
      accountId: originalJob.accountId,
      providerKey: originalJob.providerKey,
      marketplaceKey: originalJob.marketplaceKey,
      reportType: originalJob.reportType,
      mode: originalJob.mode,
      startDate: originalJob.startDate,
      endDate: originalJob.endDate,
      metadata: { ...dto.metadata, retryOf: dto.originalJobId },
    });

    await this.syncQueue.enqueue({
      jobId: job.id,
      workspaceId: job.workspaceId,
      accountId: job.accountId,
      providerKey: job.providerKey,
      marketplaceKey: job.marketplaceKey,
      reportType: job.reportType,
      mode: job.mode,
      startDate: job.startDate,
      endDate: job.endDate,
      metadata: job.metadata,
    });

    return job;
  }

  async findJobs(filter: ReportSyncJobFilterQueryDto) {
    return this.repository.findJobs(filter as any);
  }

  async getJob(jobId: string, workspaceId: string) {
    const job = await this.repository.getJob(jobId, workspaceId);
    if (!job) {
      throw new NotFoundException('Sync job not found');
    }
    return job;
  }

  async getJobProgress(jobId: string, workspaceId: string) {
    const progress = await this.stateManager.getJobProgress(jobId, workspaceId);
    if (!progress) {
      throw new NotFoundException('Sync job not found');
    }
    return progress;
  }

  async getItemResults(jobId: string, workspaceId: string, filter: ItemResultFilterQueryDto) {
    return this.repository.getItemResults(jobId, workspaceId, filter);
  }

  async getExternalRefs(workspaceId: string, accountId: string, filter: ExternalRefFilterQueryDto) {
    return this.repository.getExternalRefs(workspaceId, accountId, filter);
  }

  async getReportDocuments(workspaceId: string, accountId: string, filter: ReportDocumentFilterQueryDto) {
    return this.repository.getReportDocuments(workspaceId, accountId, filter);
  }

  async createSchedule(dto: CreateReportScheduleRequestDto) {
    this.validator.validateScheduleExpression(dto.cronExpression);
    return this.repository.createSchedule(dto);
  }

  async updateSchedule(scheduleId: string, workspaceId: string, dto: UpdateReportScheduleRequestDto) {
    if (dto.cronExpression) {
      this.validator.validateScheduleExpression(dto.cronExpression);
    }
    return this.repository.updateSchedule(scheduleId, workspaceId, dto);
  }

  async deleteSchedule(scheduleId: string, workspaceId: string) {
    return this.repository.deleteSchedule(scheduleId, workspaceId);
  }

  async getSchedules(workspaceId: string, accountId?: string) {
    return this.repository.getSchedules(workspaceId, accountId);
  }

  async getMetrics(workspaceId: string, accountId?: string) {
    return this.metrics.getMetrics(workspaceId, accountId);
  }
}
