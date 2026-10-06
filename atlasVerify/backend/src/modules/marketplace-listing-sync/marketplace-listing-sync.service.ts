import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  ConflictStrategy,
  IListingSyncJob,
  IListingSyncSchedule,
  ListingItemType,
  ListingSyncEvent,
  ListingSyncJobFilter,
  ListingSyncRequest,
  RetryFailedListingItemsRequest,
  SyncDirection,
  SyncJobStatus,
  SyncScope,
  SyncTrigger,
} from './interfaces';
import { ListingSyncRepository } from './repository/listing-sync.repository';
import { ListingSyncValidator } from './validator/listing-sync.validator';
import { ListingSyncStateManager } from './state/listing-sync-state.manager';
import { ListingSyncRunner, ListingRunnerContext } from './runner/listing-sync.runner';
import { ListingSyncScheduler } from './scheduler/listing-sync.scheduler';
import { ListingSyncEventQueue } from './events/listing-sync-events.queue';
import { ListingSyncMetrics } from './metrics/listing-sync.metrics';
import { ListingSyncQueue } from './queue/listing-sync.queue';
import { MarketplaceProviderFactoryService } from '../marketplace-provider-factory/marketplace-provider-factory.service';
import { MarketplaceCapability } from '../marketplace-provider/interfaces';
import { MP_LISTING_SYNC_ERROR_CODES } from './constants';

@Injectable()
export class MarketplaceListingSyncService {
  private readonly logger = new Logger(MarketplaceListingSyncService.name);

  constructor(
    private readonly repository: ListingSyncRepository,
    private readonly validator: ListingSyncValidator,
    private readonly stateManager: ListingSyncStateManager,
    private readonly runner: ListingSyncRunner,
    private readonly scheduler: ListingSyncScheduler,
    private readonly eventQueue: ListingSyncEventQueue,
    private readonly metrics: ListingSyncMetrics,
    private readonly syncQueue: ListingSyncQueue,
    private readonly providerFactory: MarketplaceProviderFactoryService,
  ) {
    this.scheduler.setService(this);
  }

  // ── Start Sync ────────────────────────────────────────────

  async startSync(request: ListingSyncRequest): Promise<IListingSyncJob> {
    const validation = this.validator.validate(request);
    if (!validation.valid) {
      throw new BadRequestException({ message: 'Listing sync request validation failed', errors: validation.errors });
    }

    const direction = request.direction ?? SyncDirection.INBOUND;

    if (this.stateManager.isLocked(request.workspaceId, request.accountId, direction)) {
      const activeJobId = this.stateManager.getLockedJobId(request.workspaceId, request.accountId, direction);
      throw new ConflictException({
        message: `A listing sync job is already in progress for account '${request.accountId}' (direction: ${direction})`,
        code: MP_LISTING_SYNC_ERROR_CODES.JOB_IN_PROGRESS,
        activeJobId,
      });
    }

    const correlationId = request.correlationId ?? uuidv4();

    await this.eventQueue.enqueue({
      event: ListingSyncEvent.REQUESTED,
      jobId: 'pending',
      correlationId,
      workspaceId: request.workspaceId,
      accountId: request.accountId,
      providerKey: request.providerKey.toUpperCase(),
      marketplaceKey: request.marketplaceKey.toUpperCase(),
      direction,
      scope: request.scope ?? SyncScope.INCREMENTAL,
      itemType: request.itemType ?? ListingItemType.ALL,
      timestamp: new Date(),
    });

    const job = (await this.repository.createJob({
      workspaceId: request.workspaceId,
      accountId: request.accountId,
      providerKey: request.providerKey.toUpperCase(),
      marketplaceKey: request.marketplaceKey.toUpperCase(),
      direction,
      scope: request.scope ?? SyncScope.INCREMENTAL,
      itemType: request.itemType ?? ListingItemType.ALL,
      trigger: request.trigger ?? SyncTrigger.MANUAL,
      status: SyncJobStatus.PENDING,
      conflictStrategy: request.conflictStrategy ?? ConflictStrategy.MARKETPLACE_WINS,
      filterOptions: request.filterOptions ?? null,
      scheduleId: request.scheduleId ?? null,
      correlationId,
      createdBy: request.createdBy ?? null,
    })) as unknown as IListingSyncJob;

    await this.syncQueue.enqueueSync({
      jobId: job.id,
      correlationId,
      workspaceId: request.workspaceId,
      accountId: request.accountId,
      providerKey: request.providerKey.toUpperCase(),
      marketplaceKey: request.marketplaceKey.toUpperCase(),
      direction,
      scope: request.scope ?? SyncScope.INCREMENTAL,
      itemType: request.itemType ?? ListingItemType.ALL,
      trigger: request.trigger ?? SyncTrigger.MANUAL,
      conflictStrategy: request.conflictStrategy ?? ConflictStrategy.MARKETPLACE_WINS,
      filterOptions: request.filterOptions ?? null,
      scheduleId: request.scheduleId ?? null,
    });

    await this.repository.updateJob(job.id, job.workspaceId, { status: SyncJobStatus.QUEUED });
    this.stateManager.lock(request.workspaceId, request.accountId, direction, job.id, correlationId);

    await this.repository.updateJob(job.id, job.workspaceId, { status: SyncJobStatus.PROCESSING, startedAt: new Date() });

    await this.eventQueue.enqueue({
      event: ListingSyncEvent.STARTED,
      jobId: job.id, correlationId, workspaceId: job.workspaceId,
      accountId: job.accountId, providerKey: job.providerKey, marketplaceKey: job.marketplaceKey,
      direction: job.direction, scope: job.scope, itemType: job.itemType,
      timestamp: new Date(),
    });

    let adapter: ListingRunnerContext['adapter'] | null = null;
    try {
      const resolved = await this.providerFactory.resolve({
        workspaceId: request.workspaceId,
        providerKey: request.providerKey,
        accountId: request.accountId,
        capability: MarketplaceCapability.SYNC_CATALOG,
      });
      adapter = resolved.instance.adapter as unknown as ListingRunnerContext['adapter'];
    } catch (err) {
      this.logger.warn(`Provider factory resolve failed: ${(err as Error).message}`);
    }

    if (!adapter) {
      await this.repository.updateJob(job.id, job.workspaceId, {
        status: SyncJobStatus.FAILED, completedAt: new Date(),
        errorCode: MP_LISTING_SYNC_ERROR_CODES.PROVIDER_NOT_REGISTERED,
        errorMessage: `Provider '${request.providerKey}' could not be resolved`,
      });
      this.stateManager.unlock(request.workspaceId, request.accountId, direction);
      await this.eventQueue.enqueue({
        event: ListingSyncEvent.FAILED,
        jobId: job.id, correlationId, workspaceId: job.workspaceId,
        accountId: job.accountId, providerKey: job.providerKey, marketplaceKey: job.marketplaceKey,
        direction: job.direction, scope: job.scope, itemType: job.itemType,
        errorCode: MP_LISTING_SYNC_ERROR_CODES.PROVIDER_NOT_REGISTERED,
        timestamp: new Date(),
      });
      return (await this.repository.findJobById(job.id, job.workspaceId)) as unknown as IListingSyncJob;
    }

    const ctx: ListingRunnerContext = { job: { ...job, status: SyncJobStatus.PROCESSING }, adapter };

    this.runner.run(ctx).then(async () => {
      const finished = await this.repository.findJobById(job.id, job.workspaceId);
      if (finished) this.metrics.record(finished as unknown as IListingSyncJob);
    }).catch((err) => {
      this.logger.error(`Listing sync runner crashed for job '${job.id}': ${(err as Error).message}`);
    });

    return { ...job, status: SyncJobStatus.PROCESSING };
  }

  // ── Cancel ────────────────────────────────────────────────

  async cancelSync(jobId: string, workspaceId: string): Promise<IListingSyncJob> {
    const job = await this.requireJob(jobId, workspaceId);
    if (this.stateManager.isTerminal(job.status)) {
      throw new BadRequestException({ message: `Job '${jobId}' is already in terminal status '${job.status}'` });
    }
    this.stateManager.markCancelled(jobId);
    await this.syncQueue.removeJob(job.correlationId);
    const updated = await this.repository.updateJob(jobId, workspaceId, { status: SyncJobStatus.CANCELLED, completedAt: new Date() });
    return updated as unknown as IListingSyncJob;
  }

  // ── Retry Failed Items ────────────────────────────────────

  async retryFailedItems(request: RetryFailedListingItemsRequest): Promise<IListingSyncJob> {
    const originalJob = await this.requireJob(request.jobId, request.workspaceId);
    const failedItems = await this.repository.findFailedItemResults(request.jobId, request.workspaceId);
    if (failedItems.length === 0) {
      throw new BadRequestException({ message: 'No retryable failed items found for this job' });
    }
    const itemIds = request.itemIds?.length
      ? failedItems.filter((i) => request.itemIds!.includes(i['externalId'] as string)).map((i) => i['externalId'] as string)
      : failedItems.map((i) => i['externalId'] as string);

    return this.startSync({
      workspaceId: request.workspaceId,
      accountId: originalJob.accountId,
      providerKey: originalJob.providerKey,
      marketplaceKey: originalJob.marketplaceKey,
      direction: originalJob.direction,
      scope: SyncScope.DELTA,
      itemType: originalJob.itemType,
      trigger: SyncTrigger.MANUAL,
      conflictStrategy: originalJob.conflictStrategy ?? undefined,
      filterOptions: { externalIds: itemIds } as unknown as never,
      createdBy: request.createdBy ?? null,
    });
  }

  // ── Job Queries ───────────────────────────────────────────

  async getJob(jobId: string, workspaceId: string): Promise<IListingSyncJob> {
    return this.requireJob(jobId, workspaceId);
  }

  async findJobs(filter: ListingSyncJobFilter) {
    const [items, total] = await this.repository.findJobs(filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { items: items as unknown as IListingSyncJob[], total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getJobProgress(jobId: string, workspaceId: string) {
    const job = await this.requireJob(jobId, workspaceId);
    return {
      jobId: job.id, status: job.status, processedItems: job.processedItems,
      totalItems: job.totalItems, createdItems: job.createdItems, updatedItems: job.updatedItems,
      pausedItems: job.pausedItems, activatedItems: job.activatedItems, deletedItems: job.deletedItems,
      failedItems: job.failedItems, conflictItems: job.conflictItems, skippedItems: job.skippedItems,
      cursor: job.cursor, startedAt: job.startedAt, completedAt: job.completedAt,
    };
  }

  // ── Item Results ──────────────────────────────────────────

  async getItemResults(jobId: string, workspaceId: string, opts?: { page?: number; limit?: number; status?: string | null }) {
    await this.requireJob(jobId, workspaceId);
    const [items, total] = await this.repository.findItemResults(jobId, workspaceId, opts);
    return { items, total };
  }

  // ── External Refs ─────────────────────────────────────────

  async getExternalRefs(workspaceId: string, accountId: string, opts?: { status?: string | null; page?: number; limit?: number }) {
    const [items, total] = await this.repository.findExternalRefs(workspaceId, accountId, opts);
    return { items, total };
  }

  // ── Conflicts ─────────────────────────────────────────────

  async getConflicts(workspaceId: string, opts?: { jobId?: string | null; accountId?: string | null; resolved?: boolean | null; page?: number; limit?: number }) {
    const [items, total] = await this.repository.findConflicts(workspaceId, opts);
    return { items, total };
  }

  async resolveConflict(conflictId: string, workspaceId: string, resolution: string, resolvedBy?: string, notes?: string) {
    return this.repository.resolveConflict(conflictId, workspaceId, resolution, resolvedBy, notes);
  }

  // ── Schedules ─────────────────────────────────────────────

  async createSchedule(data: {
    workspaceId: string; accountId: string; providerKey: string; marketplaceKey: string;
    direction?: SyncDirection; scope?: SyncScope;
    itemType?: ListingItemType; conflictStrategy?: ConflictStrategy;
    intervalMs: number; filterOptions?: Record<string, unknown> | null; createdBy?: string | null;
  }): Promise<IListingSyncSchedule> {
    const validation = this.validator.validateSchedule(data);
    if (!validation.valid) throw new BadRequestException({ message: 'Schedule validation failed', errors: validation.errors });

    const direction = data.direction ?? SyncDirection.INBOUND;
    const itemType = data.itemType ?? ListingItemType.ALL;

    const existing = await this.repository.findScheduleByAccount(data.workspaceId, data.accountId, direction, itemType);
    if (existing) {
      throw new ConflictException({
        message: 'A schedule already exists for this account+direction+itemType combination',
        code: MP_LISTING_SYNC_ERROR_CODES.SCHEDULE_DUPLICATE,
        scheduleId: existing['id'],
      });
    }

    const schedule = (await this.repository.createSchedule({
      workspaceId: data.workspaceId, accountId: data.accountId,
      providerKey: data.providerKey.toUpperCase(), marketplaceKey: data.marketplaceKey.toUpperCase(),
      direction, scope: data.scope ?? SyncScope.INCREMENTAL, itemType,
      conflictStrategy: data.conflictStrategy ?? ConflictStrategy.MARKETPLACE_WINS,
      intervalMs: data.intervalMs, enabled: true,
      nextRunAt: new Date(Date.now() + data.intervalMs),
      filterOptions: data.filterOptions ?? null, createdBy: data.createdBy ?? null, updatedBy: data.createdBy ?? null,
    })) as unknown as IListingSyncSchedule;

    this.scheduler.register(schedule);
    return schedule;
  }

  async updateSchedule(scheduleId: string, workspaceId: string, updates: { intervalMs?: number; enabled?: boolean; conflictStrategy?: ConflictStrategy }): Promise<IListingSyncSchedule> {
    await this.requireSchedule(scheduleId, workspaceId);
    const updated = await this.repository.updateSchedule(scheduleId, updates);
    this.scheduler.deregister(scheduleId);
    if (updates.enabled !== false) this.scheduler.register(updated as unknown as IListingSyncSchedule);
    return updated as unknown as IListingSyncSchedule;
  }

  async deleteSchedule(scheduleId: string, workspaceId: string): Promise<void> {
    await this.requireSchedule(scheduleId, workspaceId);
    await this.repository.softDeleteSchedule(scheduleId, workspaceId);
    this.scheduler.deregister(scheduleId);
  }

  async getSchedules(workspaceId: string): Promise<IListingSyncSchedule[]> {
    return (await this.repository.findSchedulesByWorkspace(workspaceId)) as unknown as IListingSyncSchedule[];
  }

  async triggerScheduleNow(scheduleId: string, workspaceId: string): Promise<void> {
    await this.requireSchedule(scheduleId, workspaceId);
    await this.scheduler.triggerNow(scheduleId);
  }

  // ── Metrics ───────────────────────────────────────────────

  getMetrics(workspaceId: string, accountId: string) { return this.metrics.getSnapshot(workspaceId, accountId); }
  getAllMetrics(workspaceId: string) { return this.metrics.getAllSnapshots(workspaceId); }

  // ── Helpers ───────────────────────────────────────────────

  private async requireJob(jobId: string, workspaceId: string): Promise<IListingSyncJob> {
    const job = await this.repository.findJobById(jobId, workspaceId);
    if (!job) throw new NotFoundException({ message: `Listing sync job '${jobId}' not found`, code: MP_LISTING_SYNC_ERROR_CODES.NOT_FOUND });
    return job as unknown as IListingSyncJob;
  }

  private async requireSchedule(scheduleId: string, workspaceId: string): Promise<IListingSyncSchedule> {
    const schedule = await this.repository.findScheduleById(scheduleId, workspaceId);
    if (!schedule) throw new NotFoundException({ message: `Listing sync schedule '${scheduleId}' not found`, code: MP_LISTING_SYNC_ERROR_CODES.SCHEDULE_NOT_FOUND });
    return schedule as unknown as IListingSyncSchedule;
  }
}
