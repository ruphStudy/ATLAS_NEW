import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { MarketplaceProviderFactoryService } from '../marketplace-provider-factory/marketplace-provider-factory.service';
import { MarketplaceCapability } from '../marketplace-provider/interfaces';
import { PriceSyncRepository } from './repository/price-sync.repository';
import { PriceSyncValidator } from './validator/price-sync.validator';
import { PriceSyncStateManager } from './state/price-sync-state.manager';
import { PriceSyncConflictResolver } from './conflict/price-sync-conflict.resolver';
import { PriceSyncEventQueue } from './events/price-sync-events.queue';
import { PriceSyncQueue } from './queue/price-sync.queue';
import { PriceSyncRunner } from './runner/price-sync.runner';
import { PriceSyncMetrics } from './metrics/price-sync.metrics';
import {
  StartPriceSyncRequestDto,
  RetryFailedPriceItemsRequestDto,
  CreatePriceScheduleRequestDto,
  UpdatePriceScheduleRequestDto,
  PriceSyncJobFilterQueryDto,
  ItemResultFilterQueryDto,
  ExternalRefFilterQueryDto,
  ConflictFilterQueryDto,
} from './dto';
import { PriceSyncEvent, ItemSyncStatus } from './interfaces';

@Injectable()
export class MarketplacePricingSyncService {
  constructor(
    private readonly providerFactory: MarketplaceProviderFactoryService,
    private readonly repository: PriceSyncRepository,
    private readonly validator: PriceSyncValidator,
    private readonly stateManager: PriceSyncStateManager,
    private readonly conflictResolver: PriceSyncConflictResolver,
    private readonly eventQueue: PriceSyncEventQueue,
    private readonly syncQueue: PriceSyncQueue,
    private readonly runner: PriceSyncRunner,
    private readonly metrics: PriceSyncMetrics,
  ) {}

  async startSync(dto: StartPriceSyncRequestDto) {
    this.validator.validateSyncRequest(dto);

    try {
      await this.providerFactory.resolve({
        workspaceId: dto.workspaceId,
        accountId: dto.accountId,
        providerKey: dto.providerKey,
        capability: MarketplaceCapability.SYNC_PRICING,
      });
    } catch {
      throw new BadRequestException(
        `Provider ${dto.providerKey}/${dto.marketplaceKey} does not support pricing sync`,
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
      direction: dto.direction,
      mode: dto.mode,
      itemType: dto.itemType,
      metadata: dto.metadata,
    });

    await this.syncQueue.enqueue({
      jobId: job.id,
      workspaceId: job.workspaceId,
      accountId: job.accountId,
      providerKey: job.providerKey,
      marketplaceKey: job.marketplaceKey,
      direction: job.direction,
      mode: job.mode,
      itemType: job.itemType,
      conflictStrategy: dto.conflictStrategy,
      cursor: dto.cursor,
      metadata: dto.metadata,
    });

    await this.eventQueue.publish({
      event: PriceSyncEvent.SYNC_STARTED,
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
      event: PriceSyncEvent.SYNC_CANCELLED,
      workspaceId,
      accountId: job.accountId,
      jobId,
    });

    return this.repository.getJob(jobId, workspaceId);
  }

  async retryFailedItems(dto: RetryFailedPriceItemsRequestDto) {
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
      direction: originalJob.direction,
      mode: originalJob.mode,
      itemType: originalJob.itemType,
      metadata: { ...dto.metadata, retryOf: dto.originalJobId },
    });

    await this.syncQueue.enqueue({
      jobId: job.id,
      workspaceId: job.workspaceId,
      accountId: job.accountId,
      providerKey: job.providerKey,
      marketplaceKey: job.marketplaceKey,
      direction: job.direction,
      mode: job.mode,
      itemType: job.itemType,
      conflictStrategy: originalJob.metadata?.conflictStrategy,
      metadata: job.metadata,
    });

    return job;
  }

  async findJobs(filter: PriceSyncJobFilterQueryDto) {
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

  async getConflicts(workspaceId: string, filter: ConflictFilterQueryDto) {
    return this.repository.getConflicts(workspaceId, filter);
  }

  async resolveConflict(
    conflictId: string,
    workspaceId: string,
    resolution: string,
    resolvedBy: string,
    notes?: string,
  ) {
    await this.conflictResolver.markConflictResolved(conflictId, workspaceId, resolution, resolvedBy, notes);

    await this.eventQueue.publish({
      event: PriceSyncEvent.PRICE_CONFLICT_RESOLVED,
      workspaceId,
      accountId: '',
      data: { conflictId, resolution, resolvedBy },
    });

    return this.repository.getConflicts(workspaceId, { limit: 1 });
  }

  async createSchedule(dto: CreatePriceScheduleRequestDto) {
    this.validator.validateScheduleExpression(dto.cronExpression);
    return this.repository.createSchedule(dto);
  }

  async updateSchedule(scheduleId: string, workspaceId: string, dto: UpdatePriceScheduleRequestDto) {
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
