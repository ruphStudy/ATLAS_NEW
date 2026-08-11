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
  IInventorySyncJob,
  IInventorySyncSchedule,
  InventoryItemType,
  InventorySyncEvent,
  InventorySyncRequest,
  RetryFailedInventoryItemsRequest,
  SyncDirection,
  SyncJobStatus,
  SyncScope,
  SyncTrigger,
  InventorySyncJobFilter,
} from './interfaces';
import { InventorySyncRepository } from './repository/inventory-sync.repository';
import { InventorySyncValidator } from './validator/inventory-sync.validator';
import { InventorySyncStateManager } from './state/inventory-sync-state.manager';
import { InventorySyncRunner, InventoryRunnerContext } from './runner/inventory-sync.runner';
import { InventorySyncScheduler } from './scheduler/inventory-sync.scheduler';
import { InventorySyncEventQueue } from './events/inventory-sync-events.queue';
import { InventorySyncMetrics } from './metrics/inventory-sync.metrics';
import { InventorySyncQueue } from './queue/inventory-sync.queue';
import { MarketplaceProviderFactoryService } from '../marketplace-provider-factory/marketplace-provider-factory.service';
import { MarketplaceCapability } from '../marketplace-provider/interfaces';
import { MP_INVENTORY_SYNC_ERROR_CODES } from './constants';

@Injectable()
export class MarketplaceInventorySyncService {
  private readonly logger = new Logger(MarketplaceInventorySyncService.name);

  constructor(
    private readonly repository: InventorySyncRepository,
    private readonly validator: InventorySyncValidator,
    private readonly stateManager: InventorySyncStateManager,
    private readonly runner: InventorySyncRunner,
    private readonly scheduler: InventorySyncScheduler,
    private readonly eventQueue: InventorySyncEventQueue,
    private readonly metrics: InventorySyncMetrics,
    private readonly syncQueue: InventorySyncQueue,
    private readonly providerFactory: MarketplaceProviderFactoryService,
  ) {
    this.scheduler.setService(this);
  }

  // ── Start Sync ────────────────────────────────────────────

  async startSync(request: InventorySyncRequest): Promise<IInventorySyncJob> {
    const validation = this.validator.validate(request);
    if (!validation.valid) {
      throw new BadRequestException({ message: 'Inventory sync request validation failed', errors: validation.errors });
    }

    const direction = request.direction ?? SyncDirection.INBOUND;

    if (this.stateManager.isLocked(request.workspaceId, request.accountId, direction)) {
      const activeJobId = this.stateManager.getLockedJobId(request.workspaceId, request.accountId, direction);
      throw new ConflictException({
        message: `An inventory sync job is already in progress for account '${request.accountId}' (direction: ${direction})`,
        code: MP_INVENTORY_SYNC_ERROR_CODES.JOB_IN_PROGRESS,
        activeJobId,
      });
    }

    const correlationId = request.correlationId ?? uuidv4();

    await this.eventQueue.enqueue({
      event: InventorySyncEvent.REQUESTED,
      jobId: 'pending',
      correlationId,
      workspaceId: request.workspaceId,
      accountId: request.accountId,
      providerKey: request.providerKey.toUpperCase(),
      marketplaceKey: request.marketplaceKey.toUpperCase(),
      warehouseId: request.warehouseId ?? null,
      direction,
      scope: request.scope ?? SyncScope.INCREMENTAL,
      itemType: request.itemType ?? InventoryItemType.ALL,
      timestamp: new Date(),
    });

    const job = (await this.repository.createJob({
      workspaceId: request.workspaceId,
      accountId: request.accountId,
      providerKey: request.providerKey.toUpperCase(),
      marketplaceKey: request.marketplaceKey.toUpperCase(),
      warehouseId: request.warehouseId ?? null,
      direction,
      scope: request.scope ?? SyncScope.INCREMENTAL,
      itemType: request.itemType ?? InventoryItemType.ALL,
      trigger: request.trigger ?? SyncTrigger.MANUAL,
      status: SyncJobStatus.PENDING,
      conflictStrategy: request.conflictStrategy ?? ConflictStrategy.MARKETPLACE_WINS,
      filterOptions: request.filterOptions ?? null,
      scheduleId: request.scheduleId ?? null,
      correlationId,
      createdBy: request.createdBy ?? null,
    })) as unknown as IInventorySyncJob;

    await this.syncQueue.enqueueSync({
      jobId: job.id,
      correlationId,
      workspaceId: request.workspaceId,
      accountId: request.accountId,
      providerKey: request.providerKey.toUpperCase(),
      marketplaceKey: request.marketplaceKey.toUpperCase(),
      warehouseId: request.warehouseId ?? null,
      direction,
      scope: request.scope ?? SyncScope.INCREMENTAL,
      itemType: request.itemType ?? InventoryItemType.ALL,
      trigger: request.trigger ?? SyncTrigger.MANUAL,
      conflictStrategy: request.conflictStrategy ?? ConflictStrategy.MARKETPLACE_WINS,
      filterOptions: request.filterOptions ?? null,
      scheduleId: request.scheduleId ?? null,
    });

    await this.repository.updateJob(job.id, job.workspaceId, { status: SyncJobStatus.QUEUED });
    this.stateManager.lock(request.workspaceId, request.accountId, direction, job.id, correlationId);

    await this.repository.updateJob(job.id, job.workspaceId, { status: SyncJobStatus.PROCESSING, startedAt: new Date() });

    await this.eventQueue.enqueue({
      event: InventorySyncEvent.STARTED,
      jobId: job.id, correlationId, workspaceId: job.workspaceId,
      accountId: job.accountId, providerKey: job.providerKey, marketplaceKey: job.marketplaceKey,
      warehouseId: job.warehouseId, direction: job.direction, scope: job.scope, itemType: job.itemType,
      timestamp: new Date(),
    });

    let adapter: InventoryRunnerContext['adapter'] | null = null;
    try {
      const resolved = await this.providerFactory.resolve({
        workspaceId: request.workspaceId,
        providerKey: request.providerKey,
        accountId: request.accountId,
        capability: MarketplaceCapability.SYNC_INVENTORY,
      });
      adapter = resolved.instance.adapter as unknown as InventoryRunnerContext['adapter'];
    } catch (err) {
      this.logger.warn(`Provider factory resolve failed: ${(err as Error).message}`);
    }

    if (!adapter) {
      await this.repository.updateJob(job.id, job.workspaceId, {
        status: SyncJobStatus.FAILED, completedAt: new Date(),
        errorCode: MP_INVENTORY_SYNC_ERROR_CODES.PROVIDER_NOT_REGISTERED,
        errorMessage: `Provider '${request.providerKey}' could not be resolved`,
      });
      this.stateManager.unlock(request.workspaceId, request.accountId, direction);
      await this.eventQueue.enqueue({
        event: InventorySyncEvent.FAILED,
        jobId: job.id, correlationId, workspaceId: job.workspaceId,
        accountId: job.accountId, providerKey: job.providerKey, marketplaceKey: job.marketplaceKey,
        warehouseId: job.warehouseId, direction: job.direction, scope: job.scope, itemType: job.itemType,
        errorCode: MP_INVENTORY_SYNC_ERROR_CODES.PROVIDER_NOT_REGISTERED,
        timestamp: new Date(),
      });
      return (await this.repository.findJobById(job.id, job.workspaceId)) as unknown as IInventorySyncJob;
    }

    const ctx: InventoryRunnerContext = { job: { ...job, status: SyncJobStatus.PROCESSING }, adapter };

    this.runner.run(ctx).then(async () => {
      const finished = await this.repository.findJobById(job.id, job.workspaceId);
      if (finished) this.metrics.record(finished as unknown as IInventorySyncJob);
    }).catch((err) => {
      this.logger.error(`Inventory sync runner crashed for job '${job.id}': ${(err as Error).message}`);
    });

    return { ...job, status: SyncJobStatus.PROCESSING };
  }

  // ── Cancel ────────────────────────────────────────────────

  async cancelSync(jobId: string, workspaceId: string): Promise<IInventorySyncJob> {
    const job = await this.requireJob(jobId, workspaceId);
    if (this.stateManager.isTerminal(job.status)) {
      throw new BadRequestException({ message: `Job '${jobId}' is already in terminal status '${job.status}'` });
    }
    this.stateManager.markCancelled(jobId);
    await this.syncQueue.removeJob(job.correlationId);
    const updated = await this.repository.updateJob(jobId, workspaceId, { status: SyncJobStatus.CANCELLED, completedAt: new Date() });
    return updated as unknown as IInventorySyncJob;
  }

  // ── Retry Failed Items ────────────────────────────────────

  async retryFailedItems(request: RetryFailedInventoryItemsRequest): Promise<IInventorySyncJob> {
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
      warehouseId: originalJob.warehouseId,
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

  async getJob(jobId: string, workspaceId: string): Promise<IInventorySyncJob> {
    return this.requireJob(jobId, workspaceId);
  }

  async findJobs(filter: InventorySyncJobFilter) {
    const [items, total] = await this.repository.findJobs(filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { items: items as unknown as IInventorySyncJob[], total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getJobProgress(jobId: string, workspaceId: string) {
    const job = await this.requireJob(jobId, workspaceId);
    return {
      jobId: job.id, status: job.status, processedItems: job.processedItems,
      totalItems: job.totalItems, pushedItems: job.pushedItems, pulledItems: job.pulledItems,
      adjustedItems: job.adjustedItems, reconciledItems: job.reconciledItems,
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

  async getExternalRefs(workspaceId: string, accountId: string, opts?: { warehouseId?: string | null; page?: number; limit?: number }) {
    const [items, total] = await this.repository.findExternalRefs(workspaceId, accountId, opts);
    return { items, total };
  }

  // ── Adjustments ───────────────────────────────────────────

  async getAdjustments(workspaceId: string, opts?: { accountId?: string | null; jobId?: string | null; status?: string | null; page?: number; limit?: number }) {
    const [items, total] = await this.repository.findAdjustments(workspaceId, opts);
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
    warehouseId?: string | null; direction?: SyncDirection; scope?: SyncScope;
    itemType?: InventoryItemType; conflictStrategy?: ConflictStrategy;
    intervalMs: number; filterOptions?: Record<string, unknown> | null; createdBy?: string | null;
  }): Promise<IInventorySyncSchedule> {
    const validation = this.validator.validateSchedule(data);
    if (!validation.valid) throw new BadRequestException({ message: 'Schedule validation failed', errors: validation.errors });

    const direction = data.direction ?? SyncDirection.INBOUND;
    const itemType = data.itemType ?? InventoryItemType.ALL;

    const existing = await this.repository.findScheduleByAccount(data.workspaceId, data.accountId, direction, itemType);
    if (existing) {
      throw new ConflictException({
        message: 'A schedule already exists for this account+direction+itemType combination',
        code: MP_INVENTORY_SYNC_ERROR_CODES.SCHEDULE_DUPLICATE,
        scheduleId: existing['id'],
      });
    }

    const schedule = (await this.repository.createSchedule({
      workspaceId: data.workspaceId, accountId: data.accountId,
      providerKey: data.providerKey.toUpperCase(), marketplaceKey: data.marketplaceKey.toUpperCase(),
      warehouseId: data.warehouseId ?? null,
      direction, scope: data.scope ?? SyncScope.INCREMENTAL, itemType,
      conflictStrategy: data.conflictStrategy ?? ConflictStrategy.MARKETPLACE_WINS,
      intervalMs: data.intervalMs, enabled: true,
      nextRunAt: new Date(Date.now() + data.intervalMs),
      filterOptions: data.filterOptions ?? null, createdBy: data.createdBy ?? null, updatedBy: data.createdBy ?? null,
    })) as unknown as IInventorySyncSchedule;

    this.scheduler.register(schedule);
    return schedule;
  }

  async updateSchedule(scheduleId: string, workspaceId: string, updates: { intervalMs?: number; enabled?: boolean; conflictStrategy?: ConflictStrategy }): Promise<IInventorySyncSchedule> {
    await this.requireSchedule(scheduleId, workspaceId);
    const updated = await this.repository.updateSchedule(scheduleId, updates);
    this.scheduler.deregister(scheduleId);
    if (updates.enabled !== false) this.scheduler.register(updated as unknown as IInventorySyncSchedule);
    return updated as unknown as IInventorySyncSchedule;
  }

  async deleteSchedule(scheduleId: string, workspaceId: string): Promise<void> {
    await this.requireSchedule(scheduleId, workspaceId);
    await this.repository.softDeleteSchedule(scheduleId, workspaceId);
    this.scheduler.deregister(scheduleId);
  }

  async getSchedules(workspaceId: string): Promise<IInventorySyncSchedule[]> {
    return (await this.repository.findSchedulesByWorkspace(workspaceId)) as unknown as IInventorySyncSchedule[];
  }

  async triggerScheduleNow(scheduleId: string, workspaceId: string): Promise<void> {
    await this.requireSchedule(scheduleId, workspaceId);
    await this.scheduler.triggerNow(scheduleId);
  }

  // ── Metrics ───────────────────────────────────────────────

  getMetrics(workspaceId: string, accountId: string) { return this.metrics.getSnapshot(workspaceId, accountId); }
  getAllMetrics(workspaceId: string) { return this.metrics.getAllSnapshots(workspaceId); }

  // ── Helpers ───────────────────────────────────────────────

  private async requireJob(jobId: string, workspaceId: string): Promise<IInventorySyncJob> {
    const job = await this.repository.findJobById(jobId, workspaceId);
    if (!job) throw new NotFoundException({ message: `Inventory sync job '${jobId}' not found`, code: MP_INVENTORY_SYNC_ERROR_CODES.NOT_FOUND });
    return job as unknown as IInventorySyncJob;
  }

  private async requireSchedule(scheduleId: string, workspaceId: string): Promise<IInventorySyncSchedule> {
    const schedule = await this.repository.findScheduleById(scheduleId, workspaceId);
    if (!schedule) throw new NotFoundException({ message: `Inventory sync schedule '${scheduleId}' not found`, code: MP_INVENTORY_SYNC_ERROR_CODES.SCHEDULE_NOT_FOUND });
    return schedule as unknown as IInventorySyncSchedule;
  }
}
