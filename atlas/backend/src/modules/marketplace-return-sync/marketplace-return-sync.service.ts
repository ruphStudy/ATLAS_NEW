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
  IReturnSyncJob,
  IReturnSyncSchedule,
  ReturnItemType,
  ReturnSyncEvent,
  ReturnSyncJobFilter,
  ReturnSyncRequest,
  RetryFailedReturnItemsRequest,
  SyncDirection,
  SyncJobStatus,
  SyncScope,
  SyncTrigger,
} from './interfaces';
import { ReturnSyncRepository } from './repository/return-sync.repository';
import { ReturnSyncValidator } from './validator/return-sync.validator';
import { ReturnSyncStateManager } from './state/return-sync-state.manager';
import { ReturnSyncRunner, ReturnRunnerContext } from './runner/return-sync.runner';
import { ReturnSyncScheduler } from './scheduler/return-sync.scheduler';
import { ReturnSyncEventQueue } from './events/return-sync-events.queue';
import { ReturnSyncMetrics } from './metrics/return-sync.metrics';
import { ReturnSyncQueue } from './queue/return-sync.queue';
import { MarketplaceProviderFactoryService } from '../marketplace-provider-factory/marketplace-provider-factory.service';
import { MarketplaceCapability } from '../marketplace-provider/interfaces';
import { MP_RETURN_SYNC_ERROR_CODES } from './constants';

@Injectable()
export class MarketplaceReturnSyncService {
  private readonly logger = new Logger(MarketplaceReturnSyncService.name);

  constructor(
    private readonly repository: ReturnSyncRepository,
    private readonly validator: ReturnSyncValidator,
    private readonly stateManager: ReturnSyncStateManager,
    private readonly runner: ReturnSyncRunner,
    private readonly scheduler: ReturnSyncScheduler,
    private readonly eventQueue: ReturnSyncEventQueue,
    private readonly metrics: ReturnSyncMetrics,
    private readonly syncQueue: ReturnSyncQueue,
    private readonly providerFactory: MarketplaceProviderFactoryService,
  ) {
    this.scheduler.setService(this);
  }

  async startSync(request: ReturnSyncRequest): Promise<IReturnSyncJob> {
    const validation = this.validator.validate(request);
    if (!validation.valid) {
      throw new BadRequestException({ message: 'Return sync request validation failed', errors: validation.errors });
    }

    const direction = request.direction ?? SyncDirection.INBOUND;

    if (this.stateManager.isLocked(request.workspaceId, request.accountId, direction)) {
      const activeJobId = this.stateManager.getLockedJobId(request.workspaceId, request.accountId, direction);
      throw new ConflictException({
        message: `A return sync job is already in progress for account '${request.accountId}' (direction: ${direction})`,
        code: MP_RETURN_SYNC_ERROR_CODES.JOB_IN_PROGRESS,
        activeJobId,
      });
    }

    const correlationId = request.correlationId ?? uuidv4();

    await this.eventQueue.enqueue({
      event: ReturnSyncEvent.REQUESTED,
      jobId: 'pending',
      correlationId,
      workspaceId: request.workspaceId,
      accountId: request.accountId,
      providerKey: request.providerKey.toUpperCase(),
      marketplaceKey: request.marketplaceKey.toUpperCase(),
      direction,
      scope: request.scope ?? SyncScope.INCREMENTAL,
      itemType: request.itemType ?? ReturnItemType.ALL,
      timestamp: new Date(),
    });

    const job = (await this.repository.createJob({
      workspaceId: request.workspaceId,
      accountId: request.accountId,
      providerKey: request.providerKey.toUpperCase(),
      marketplaceKey: request.marketplaceKey.toUpperCase(),
      direction,
      scope: request.scope ?? SyncScope.INCREMENTAL,
      itemType: request.itemType ?? ReturnItemType.ALL,
      trigger: request.trigger ?? SyncTrigger.MANUAL,
      status: SyncJobStatus.PENDING,
      conflictStrategy: request.conflictStrategy ?? ConflictStrategy.MARKETPLACE_WINS,
      filterOptions: request.filterOptions ?? null,
      scheduleId: request.scheduleId ?? null,
      correlationId,
      createdBy: request.createdBy ?? null,
    })) as unknown as IReturnSyncJob;

    await this.syncQueue.enqueueSync({
      jobId: job.id,
      correlationId,
      workspaceId: request.workspaceId,
      accountId: request.accountId,
      providerKey: request.providerKey.toUpperCase(),
      marketplaceKey: request.marketplaceKey.toUpperCase(),
      direction,
      scope: request.scope ?? SyncScope.INCREMENTAL,
      itemType: request.itemType ?? ReturnItemType.ALL,
      trigger: request.trigger ?? SyncTrigger.MANUAL,
      conflictStrategy: request.conflictStrategy ?? ConflictStrategy.MARKETPLACE_WINS,
      filterOptions: request.filterOptions ?? null,
      scheduleId: request.scheduleId ?? null,
    });

    await this.repository.updateJob(job.id, job.workspaceId, { status: SyncJobStatus.QUEUED });
    this.stateManager.lock(request.workspaceId, request.accountId, direction, job.id, correlationId);

    await this.repository.updateJob(job.id, job.workspaceId, { status: SyncJobStatus.PROCESSING, startedAt: new Date() });

    await this.eventQueue.enqueue({
      event: ReturnSyncEvent.STARTED,
      jobId: job.id, correlationId, workspaceId: job.workspaceId,
      accountId: job.accountId, providerKey: job.providerKey, marketplaceKey: job.marketplaceKey,
      direction: job.direction, scope: job.scope, itemType: job.itemType,
      timestamp: new Date(),
    });

    let adapter: ReturnRunnerContext['adapter'] | null = null;
    try {
      const resolved = await this.providerFactory.resolve({
        workspaceId: request.workspaceId,
        providerKey: request.providerKey,
        accountId: request.accountId,
        capability: MarketplaceCapability.SYNC_RETURNS,
      });
      adapter = resolved.instance.adapter as unknown as ReturnRunnerContext['adapter'];
    } catch (err) {
      this.logger.warn(`Provider factory resolve failed: ${(err as Error).message}`);
    }

    if (!adapter) {
      await this.repository.updateJob(job.id, job.workspaceId, {
        status: SyncJobStatus.FAILED, completedAt: new Date(),
        errorCode: MP_RETURN_SYNC_ERROR_CODES.PROVIDER_NOT_REGISTERED,
        errorMessage: `Provider '${request.providerKey}' could not be resolved`,
      });
      this.stateManager.unlock(request.workspaceId, request.accountId, direction);
      throw new NotFoundException(`Provider '${request.providerKey}' not registered`);
    }

    void this.runner.run({ job, adapter });

    this.logger.log(`Return sync started: ${job.id} [${job.providerKey}/${job.marketplaceKey}] – ${direction}`);
    return job;
  }

  async cancelSync(jobId: string, workspaceId: string): Promise<IReturnSyncJob> {
    const job = await this.repository.findJobById(jobId, workspaceId);
    if (!job) {
      throw new NotFoundException({ message: 'Return sync job not found', code: MP_RETURN_SYNC_ERROR_CODES.NOT_FOUND });
    }

    if (this.stateManager.isTerminal(job['status'] as SyncJobStatus)) {
      throw new BadRequestException({ message: 'Job is already in terminal state', code: MP_RETURN_SYNC_ERROR_CODES.JOB_CANCELLED });
    }

    this.stateManager.markCancelled(jobId);
    this.logger.log(`Return sync job marked for cancellation: ${jobId}`);
    return job as unknown as IReturnSyncJob;
  }

  async retryFailedItems(request: RetryFailedReturnItemsRequest): Promise<IReturnSyncJob> {
    const job = await this.repository.findJobById(request.jobId, request.workspaceId);
    if (!job) {
      throw new NotFoundException({ message: 'Return sync job not found', code: MP_RETURN_SYNC_ERROR_CODES.NOT_FOUND });
    }

    const failedItems = await this.repository.findFailedItemResults(request.jobId, request.workspaceId);
    this.logger.log(`Retrying ${failedItems.length} failed return sync items for job ${request.jobId}`);

    return job as unknown as IReturnSyncJob;
  }

  async findJobs(filter: ReturnSyncJobFilter): Promise<{ items: IReturnSyncJob[]; total: number; page: number; limit: number; totalPages: number }> {
    const [items, total] = await this.repository.findJobs(filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const totalPages = Math.ceil(total / limit);
    return { items: items as unknown as IReturnSyncJob[], total, page, limit, totalPages };
  }

  async getJob(jobId: string, workspaceId: string): Promise<IReturnSyncJob> {
    const job = await this.repository.findJobById(jobId, workspaceId);
    if (!job) {
      throw new NotFoundException({ message: 'Return sync job not found', code: MP_RETURN_SYNC_ERROR_CODES.NOT_FOUND });
    }
    return job as unknown as IReturnSyncJob;
  }

  async getJobProgress(jobId: string, workspaceId: string) {
    const job = await this.getJob(jobId, workspaceId);
    const total = job.totalItems ?? job.processedItems;
    const percentage = total > 0 ? Math.round((job.processedItems / total) * 100) : 0;
    return {
      jobId,
      status: job.status,
      processedItems: job.processedItems,
      totalItems: job.totalItems,
      percentage,
      importedReturns: job.importedReturns,
      updatedReturns: job.updatedReturns,
      approvedReturns: job.approvedReturns,
      rejectedReturns: job.rejectedReturns,
      refundedReturns: job.refundedReturns,
      failedItems: job.failedItems,
      conflictItems: job.conflictItems,
      skippedItems: job.skippedItems,
    };
  }

  async getItemResults(jobId: string, workspaceId: string, opts?: { page?: number; limit?: number; status?: string | null }) {
    const [items, total] = await this.repository.findItemResults(jobId, workspaceId, opts);
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 50;
    const totalPages = Math.ceil(total / limit);
    return { items, total, page, limit, totalPages };
  }

  async getExternalRefs(workspaceId: string, accountId: string, opts?: { status?: string | null; page?: number; limit?: number }) {
    const [items, total] = await this.repository.findExternalRefs(workspaceId, accountId, opts);
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 50;
    const totalPages = Math.ceil(total / limit);
    return { items, total, page, limit, totalPages };
  }

  async getConflicts(workspaceId: string, opts?: { accountId?: string; resolved?: boolean; page?: number; limit?: number }) {
    const [items, total] = await this.repository.findConflicts(workspaceId, opts);
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 50;
    const totalPages = Math.ceil(total / limit);
    return { items, total, page, limit, totalPages };
  }

  async resolveConflict(conflictId: string, workspaceId: string, resolution: string, resolvedBy: string, notes?: string) {
    return this.repository.resolveConflict(conflictId, workspaceId, resolution, resolvedBy, notes);
  }

  async createSchedule(data: {
    workspaceId: string;
    accountId: string;
    providerKey: string;
    marketplaceKey: string;
    direction: SyncDirection;
    scope: SyncScope;
    itemType: ReturnItemType;
    conflictStrategy?: ConflictStrategy;
    intervalMs: number;
    enabled?: boolean;
    filterOptions?: Record<string, unknown>;
    createdBy?: string | null;
  }): Promise<IReturnSyncSchedule> {
    const validation = this.validator.validateSchedule(data);
    if (!validation.valid) {
      throw new BadRequestException({ message: 'Schedule validation failed', errors: validation.errors });
    }

    const nextRunAt = new Date(Date.now() + data.intervalMs);
    const schedule = await this.repository.createSchedule({
      ...data,
      enabled: data.enabled ?? true,
      nextRunAt,
    });

    this.logger.log(`Return sync schedule created: ${schedule['id']} [${data.providerKey}/${data.marketplaceKey}]`);
    return schedule as unknown as IReturnSyncSchedule;
  }

  async updateSchedule(scheduleId: string, workspaceId: string, updates: Record<string, unknown>): Promise<IReturnSyncSchedule> {
    const schedule = await this.repository.findScheduleById(scheduleId, workspaceId);
    if (!schedule) {
      throw new NotFoundException({ message: 'Schedule not found', code: MP_RETURN_SYNC_ERROR_CODES.SCHEDULE_NOT_FOUND });
    }
    const updated = await this.repository.updateSchedule(scheduleId, workspaceId, updates);
    return updated as unknown as IReturnSyncSchedule;
  }

  async deleteSchedule(scheduleId: string, workspaceId: string): Promise<void> {
    const schedule = await this.repository.findScheduleById(scheduleId, workspaceId);
    if (!schedule) {
      throw new NotFoundException({ message: 'Schedule not found', code: MP_RETURN_SYNC_ERROR_CODES.SCHEDULE_NOT_FOUND });
    }
    await this.repository.deleteSchedule(scheduleId, workspaceId);
    this.logger.log(`Return sync schedule deleted: ${scheduleId}`);
  }

  async getSchedules(workspaceId: string, opts?: { accountId?: string; enabled?: boolean }): Promise<IReturnSyncSchedule[]> {
    const schedules = await this.repository.findSchedules(workspaceId, opts);
    return schedules as unknown as IReturnSyncSchedule[];
  }

  async getMetrics(workspaceId: string, accountId?: string) {
    return this.metrics.getSnapshot(workspaceId, accountId);
  }
}
