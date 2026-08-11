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
  IShipmentSyncJob,
  IShipmentSyncSchedule,
  ShipmentItemType,
  ShipmentSyncEvent,
  ShipmentSyncJobFilter,
  ShipmentSyncRequest,
  RetryFailedShipmentItemsRequest,
  SyncDirection,
  SyncJobStatus,
  SyncScope,
  SyncTrigger,
} from './interfaces';
import { ShipmentSyncRepository } from './repository/shipment-sync.repository';
import { ShipmentSyncValidator } from './validator/shipment-sync.validator';
import { ShipmentSyncStateManager } from './state/shipment-sync-state.manager';
import { ShipmentSyncRunner, ShipmentRunnerContext } from './runner/shipment-sync.runner';
import { ShipmentSyncScheduler } from './scheduler/shipment-sync.scheduler';
import { ShipmentSyncEventQueue } from './events/shipment-sync-events.queue';
import { ShipmentSyncMetrics } from './metrics/shipment-sync.metrics';
import { ShipmentSyncQueue } from './queue/shipment-sync.queue';
import { MarketplaceProviderFactoryService } from '../marketplace-provider-factory/marketplace-provider-factory.service';
import { MarketplaceCapability } from '../marketplace-provider/interfaces';
import { MP_SHIPMENT_SYNC_ERROR_CODES } from './constants';

@Injectable()
export class MarketplaceShipmentSyncService {
  private readonly logger = new Logger(MarketplaceShipmentSyncService.name);

  constructor(
    private readonly repository: ShipmentSyncRepository,
    private readonly validator: ShipmentSyncValidator,
    private readonly stateManager: ShipmentSyncStateManager,
    private readonly runner: ShipmentSyncRunner,
    private readonly scheduler: ShipmentSyncScheduler,
    private readonly eventQueue: ShipmentSyncEventQueue,
    private readonly metrics: ShipmentSyncMetrics,
    private readonly syncQueue: ShipmentSyncQueue,
    private readonly providerFactory: MarketplaceProviderFactoryService,
  ) {
    this.scheduler.setService(this);
  }

  async startSync(request: ShipmentSyncRequest): Promise<IShipmentSyncJob> {
    const validation = this.validator.validate(request);
    if (!validation.valid) {
      throw new BadRequestException({ message: 'Shipment sync request validation failed', errors: validation.errors });
    }

    const direction = request.direction ?? SyncDirection.INBOUND;

    if (this.stateManager.isLocked(request.workspaceId, request.accountId, direction)) {
      const activeJobId = this.stateManager.getLockedJobId(request.workspaceId, request.accountId, direction);
      throw new ConflictException({
        message: `A shipment sync job is already in progress for account '${request.accountId}' (direction: ${direction})`,
        code: MP_SHIPMENT_SYNC_ERROR_CODES.JOB_IN_PROGRESS,
        activeJobId,
      });
    }

    const correlationId = request.correlationId ?? uuidv4();

    await this.eventQueue.enqueue({
      event: ShipmentSyncEvent.REQUESTED,
      jobId: 'pending',
      correlationId,
      workspaceId: request.workspaceId,
      accountId: request.accountId,
      providerKey: request.providerKey.toUpperCase(),
      marketplaceKey: request.marketplaceKey.toUpperCase(),
      direction,
      scope: request.scope ?? SyncScope.INCREMENTAL,
      itemType: request.itemType ?? ShipmentItemType.ALL,
      timestamp: new Date(),
    });

    const job = (await this.repository.createJob({
      workspaceId: request.workspaceId,
      accountId: request.accountId,
      providerKey: request.providerKey.toUpperCase(),
      marketplaceKey: request.marketplaceKey.toUpperCase(),
      direction,
      scope: request.scope ?? SyncScope.INCREMENTAL,
      itemType: request.itemType ?? ShipmentItemType.ALL,
      trigger: request.trigger ?? SyncTrigger.MANUAL,
      status: SyncJobStatus.PENDING,
      conflictStrategy: request.conflictStrategy ?? ConflictStrategy.MARKETPLACE_WINS,
      filterOptions: request.filterOptions ?? null,
      scheduleId: request.scheduleId ?? null,
      correlationId,
      createdBy: request.createdBy ?? null,
    })) as unknown as IShipmentSyncJob;

    await this.syncQueue.enqueueSync({
      jobId: job.id,
      correlationId,
      workspaceId: request.workspaceId,
      accountId: request.accountId,
      providerKey: request.providerKey.toUpperCase(),
      marketplaceKey: request.marketplaceKey.toUpperCase(),
      direction,
      scope: request.scope ?? SyncScope.INCREMENTAL,
      itemType: request.itemType ?? ShipmentItemType.ALL,
      trigger: request.trigger ?? SyncTrigger.MANUAL,
      conflictStrategy: request.conflictStrategy ?? ConflictStrategy.MARKETPLACE_WINS,
      filterOptions: request.filterOptions ?? null,
      scheduleId: request.scheduleId ?? null,
    });

    await this.repository.updateJob(job.id, job.workspaceId, { status: SyncJobStatus.QUEUED });
    this.stateManager.lock(request.workspaceId, request.accountId, direction, job.id, correlationId);

    await this.repository.updateJob(job.id, job.workspaceId, { status: SyncJobStatus.PROCESSING, startedAt: new Date() });

    await this.eventQueue.enqueue({
      event: ShipmentSyncEvent.STARTED,
      jobId: job.id, correlationId, workspaceId: job.workspaceId,
      accountId: job.accountId, providerKey: job.providerKey, marketplaceKey: job.marketplaceKey,
      direction: job.direction, scope: job.scope, itemType: job.itemType,
      timestamp: new Date(),
    });

    let adapter: ShipmentRunnerContext['adapter'] | null = null;
    try {
      const resolved = await this.providerFactory.resolve({
        workspaceId: request.workspaceId,
        providerKey: request.providerKey,
        accountId: request.accountId,
        capability: MarketplaceCapability.SYNC_SHIPMENTS,
      });
      adapter = resolved.instance.adapter as unknown as ShipmentRunnerContext['adapter'];
    } catch (err) {
      this.logger.warn(`Provider factory resolve failed: ${(err as Error).message}`);
    }

    if (!adapter) {
      await this.repository.updateJob(job.id, job.workspaceId, {
        status: SyncJobStatus.FAILED, completedAt: new Date(),
        errorCode: MP_SHIPMENT_SYNC_ERROR_CODES.PROVIDER_NOT_REGISTERED,
        errorMessage: `Provider '${request.providerKey}' could not be resolved`,
      });
      this.stateManager.unlock(request.workspaceId, request.accountId, direction);
      throw new NotFoundException(`Provider '${request.providerKey}' not registered`);
    }

    void this.runner.run({ job, adapter });

    this.logger.log(`Shipment sync started: ${job.id} [${job.providerKey}/${job.marketplaceKey}] – ${direction}`);
    return job;
  }

  async cancelSync(jobId: string, workspaceId: string): Promise<IShipmentSyncJob> {
    const job = await this.repository.findJobById(jobId, workspaceId);
    if (!job) {
      throw new NotFoundException({ message: 'Shipment sync job not found', code: MP_SHIPMENT_SYNC_ERROR_CODES.NOT_FOUND });
    }

    if (this.stateManager.isTerminal(job['status'] as SyncJobStatus)) {
      throw new BadRequestException({ message: 'Job is already in terminal state', code: MP_SHIPMENT_SYNC_ERROR_CODES.JOB_CANCELLED });
    }

    this.stateManager.markCancelled(jobId);
    this.logger.log(`Shipment sync job marked for cancellation: ${jobId}`);
    return job as unknown as IShipmentSyncJob;
  }

  async retryFailedItems(request: RetryFailedShipmentItemsRequest): Promise<IShipmentSyncJob> {
    const job = await this.repository.findJobById(request.jobId, request.workspaceId);
    if (!job) {
      throw new NotFoundException({ message: 'Shipment sync job not found', code: MP_SHIPMENT_SYNC_ERROR_CODES.NOT_FOUND });
    }

    const failedItems = await this.repository.findFailedItemResults(request.jobId, request.workspaceId);
    this.logger.log(`Retrying ${failedItems.length} failed shipment sync items for job ${request.jobId}`);

    return job as unknown as IShipmentSyncJob;
  }

  async findJobs(filter: ShipmentSyncJobFilter): Promise<{ items: IShipmentSyncJob[]; total: number; page: number; limit: number; totalPages: number }> {
    const [items, total] = await this.repository.findJobs(filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const totalPages = Math.ceil(total / limit);
    return { items: items as unknown as IShipmentSyncJob[], total, page, limit, totalPages };
  }

  async getJob(jobId: string, workspaceId: string): Promise<IShipmentSyncJob> {
    const job = await this.repository.findJobById(jobId, workspaceId);
    if (!job) {
      throw new NotFoundException({ message: 'Shipment sync job not found', code: MP_SHIPMENT_SYNC_ERROR_CODES.NOT_FOUND });
    }
    return job as unknown as IShipmentSyncJob;
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
      importedShipments: job.importedShipments,
      updatedShipments: job.updatedShipments,
      cancelledShipments: job.cancelledShipments,
      deliveredShipments: job.deliveredShipments,
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
    itemType: ShipmentItemType;
    conflictStrategy?: ConflictStrategy;
    intervalMs: number;
    enabled?: boolean;
    filterOptions?: Record<string, unknown>;
    createdBy?: string | null;
  }): Promise<IShipmentSyncSchedule> {
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

    this.logger.log(`Shipment sync schedule created: ${schedule['id']} [${data.providerKey}/${data.marketplaceKey}]`);
    return schedule as unknown as IShipmentSyncSchedule;
  }

  async updateSchedule(scheduleId: string, workspaceId: string, updates: Record<string, unknown>): Promise<IShipmentSyncSchedule> {
    const schedule = await this.repository.findScheduleById(scheduleId, workspaceId);
    if (!schedule) {
      throw new NotFoundException({ message: 'Schedule not found', code: MP_SHIPMENT_SYNC_ERROR_CODES.SCHEDULE_NOT_FOUND });
    }
    const updated = await this.repository.updateSchedule(scheduleId, workspaceId, updates);
    return updated as unknown as IShipmentSyncSchedule;
  }

  async deleteSchedule(scheduleId: string, workspaceId: string): Promise<void> {
    const schedule = await this.repository.findScheduleById(scheduleId, workspaceId);
    if (!schedule) {
      throw new NotFoundException({ message: 'Schedule not found', code: MP_SHIPMENT_SYNC_ERROR_CODES.SCHEDULE_NOT_FOUND });
    }
    await this.repository.deleteSchedule(scheduleId, workspaceId);
    this.logger.log(`Shipment sync schedule deleted: ${scheduleId}`);
  }

  async getSchedules(workspaceId: string, opts?: { accountId?: string; enabled?: boolean }): Promise<IShipmentSyncSchedule[]> {
    const schedules = await this.repository.findSchedules(workspaceId, opts);
    return schedules as unknown as IShipmentSyncSchedule[];
  }

  async getMetrics(workspaceId: string, accountId?: string) {
    return this.metrics.getSnapshot(workspaceId, accountId);
  }
}
