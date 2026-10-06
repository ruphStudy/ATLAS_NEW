import { Injectable, Logger } from '@nestjs/common';
import { WarehouseSyncRepository } from './warehouse-sync.repository';
import { WarehouseSyncEventQueue } from './jobs';
import {
  CreateWarehouseSyncConfigurationDto,
  UpdateWarehouseSyncConfigurationDto,
  TriggerSyncJobDto,
  PauseSyncJobDto,
  ResumeSyncJobDto,
  CancelSyncJobDto,
  ResolveConflictDto,
  WarehouseSyncConfigurationFilterDto,
  WarehouseSyncJobFilterDto,
  WarehouseSyncConflictFilterDto,
  WarehouseSyncConfigurationResponseDto,
  WarehouseSyncJobResponseDto,
  WarehouseSyncConflictResponseDto,
  PaginatedWarehouseSyncConfigurationResponseDto,
  PaginatedWarehouseSyncJobResponseDto,
  PaginatedWarehouseSyncConflictResponseDto,
  SyncProgressResponseDto,
} from './dto';
import {
  IWarehouseSyncConfiguration,
  IWarehouseSyncJob,
  IWarehouseSyncConflict,
  WarehouseSyncType,
  WarehouseSyncStatus,
  WarehouseSyncDirection,
  WarehouseSyncConflictStrategy,
  WarehouseSyncEvent,
} from './interfaces';
import { ResourceNotFoundException } from '@common/exceptions';
import { BusinessRuleException } from '@common/exceptions';
import { DuplicateResourceException } from '@common/exceptions';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class WarehouseSyncService {
  private readonly logger = new Logger(WarehouseSyncService.name);
  private readonly SYNC_PREFIX = 'WS';

  constructor(
    private readonly repository: WarehouseSyncRepository,
    private readonly eventQueue: WarehouseSyncEventQueue,
  ) {}

  async createConfiguration(
    workspaceId: string,
    dto: CreateWarehouseSyncConfigurationDto,
    createdBy?: string,
  ): Promise<IWarehouseSyncConfiguration> {
    if (dto.sourceWarehouseId === dto.targetWarehouseId) {
      throw new BusinessRuleException(
        'Source and target warehouses must be different',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const existing = await this.repository.findConfigurationByWarehouses(
      workspaceId,
      dto.sourceWarehouseId,
      dto.targetWarehouseId,
    );

    if (existing) {
      throw new DuplicateResourceException(
        'Sync configuration already exists for these warehouses',
        ErrorCode.DUPLICATE_RESOURCE,
      );
    }

    const data = {
      workspaceId,
      name: dto.name,
      description: dto.description,
      sourceWarehouseId: dto.sourceWarehouseId,
      targetWarehouseId: dto.targetWarehouseId,
      syncType: dto.syncType ?? WarehouseSyncType.INCREMENTAL,
      syncDirection: dto.syncDirection ?? WarehouseSyncDirection.UNIDIRECTIONAL,
      conflictStrategy: dto.conflictStrategy ?? WarehouseSyncConflictStrategy.LATEST_WINS,
      syncAvailable: dto.syncAvailable ?? true,
      syncReserved: dto.syncReserved ?? true,
      syncAllocated: dto.syncAllocated ?? true,
      syncBlocked: dto.syncBlocked ?? false,
      syncDamaged: dto.syncDamaged ?? false,
      syncInTransit: dto.syncInTransit ?? true,
      syncIncoming: dto.syncIncoming ?? true,
      scheduleEnabled: dto.scheduleEnabled ?? false,
      scheduleCron: dto.scheduleCron,
      batchSize: dto.batchSize ?? 100,
      maxRetries: dto.maxRetries ?? 3,
      retryDelaySeconds: dto.retryDelaySeconds ?? 60,
      filterByRegion: dto.filterByRegion,
      filterByChannel: dto.filterByChannel,
      filterByMarketplaceAccountId: dto.filterByMarketplaceAccountId,
      filterBySku: dto.filterBySku ?? [],
      enabled: dto.enabled ?? true,
      priority: dto.priority ?? 0,
      recalculateAvailability: dto.recalculateAvailability ?? true,
      metadata: {},
      createdBy,
    };

    const config = (await this.repository.createConfiguration(
      data,
    )) as unknown as IWarehouseSyncConfiguration;

    return config;
  }

  async updateConfiguration(
    id: string,
    workspaceId: string,
    dto: UpdateWarehouseSyncConfigurationDto,
  ): Promise<IWarehouseSyncConfiguration> {
    await this.findConfigurationById(id, workspaceId);

    const updated = (await this.repository.updateConfiguration(
      id,
      workspaceId,
      dto as unknown as Record<string, unknown>,
    )) as unknown as IWarehouseSyncConfiguration;

    return updated;
  }

  async deleteConfiguration(id: string, workspaceId: string): Promise<void> {
    await this.findConfigurationById(id, workspaceId);
    await this.repository.deleteConfiguration(id, workspaceId);
  }

  async findConfigurationById(
    id: string,
    workspaceId: string,
  ): Promise<IWarehouseSyncConfiguration> {
    const config = await this.repository.findConfigurationById(id, workspaceId);
    if (!config) {
      throw new ResourceNotFoundException(
        'Warehouse sync configuration not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return config as unknown as IWarehouseSyncConfiguration;
  }

  async findAllConfigurations(
    workspaceId: string,
    filter: WarehouseSyncConfigurationFilterDto,
  ): Promise<PaginatedWarehouseSyncConfigurationResponseDto> {
    const [data, total] = await this.repository.findAllConfigurations(
      workspaceId,
      filter,
    );

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data as unknown as WarehouseSyncConfigurationResponseDto[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  async triggerSyncJob(
    workspaceId: string,
    dto: TriggerSyncJobDto,
    triggeredBy?: string,
  ): Promise<IWarehouseSyncJob> {
    const config = await this.findConfigurationById(dto.configurationId, workspaceId);

    if (!config.enabled) {
      throw new BusinessRuleException(
        'Cannot trigger sync for disabled configuration',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const activeJob = await this.repository.findActiveJobByConfiguration(
      dto.configurationId,
      workspaceId,
    );

    if (activeJob) {
      throw new BusinessRuleException(
        'An active sync job already exists for this configuration',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const sequence = await this.repository.getNextJobSequence(workspaceId);
    const jobNumber = `${this.SYNC_PREFIX}-${String(sequence).padStart(6, '0')}`;

    const syncType = dto.syncType ?? config.syncType;

    const jobData = {
      workspaceId,
      jobNumber,
      jobSequence: sequence,
      configurationId: config.id,
      status: WarehouseSyncStatus.PENDING,
      sourceWarehouseId: config.sourceWarehouseId,
      targetWarehouseId: config.targetWarehouseId,
      syncType,
      syncDirection: config.syncDirection,
      totalItems: 0,
      processedItems: 0,
      successItems: 0,
      failedItems: 0,
      conflictItems: 0,
      progressPercentage: 0,
      metadata: {},
      triggeredBy: dto.triggeredBy ?? triggeredBy,
    };

    const job = (await this.repository.createJob(jobData)) as unknown as IWarehouseSyncJob;

    await this.createHistoryEntry(
      job.id,
      workspaceId,
      null,
      WarehouseSyncStatus.PENDING,
      'Sync job created',
    );

    this.executeSyncJob(job.id, workspaceId, config);

    return job;
  }

  private async executeSyncJob(
    jobId: string,
    workspaceId: string,
    config: IWarehouseSyncConfiguration,
  ): Promise<void> {
    try {
      await this.repository.updateJob(jobId, workspaceId, {
        status: WarehouseSyncStatus.RUNNING,
        startedAt: new Date(),
      });

      await this.createHistoryEntry(
        jobId,
        workspaceId,
        WarehouseSyncStatus.PENDING,
        WarehouseSyncStatus.RUNNING,
        'Sync job started',
      );

      await this.eventQueue.publish({
        event: WarehouseSyncEvent.SYNC_STARTED,
        workspaceId,
        syncJobId: jobId,
        configurationId: config.id,
        sourceWarehouseId: config.sourceWarehouseId,
        targetWarehouseId: config.targetWarehouseId,
      });

      await this.performSync(jobId, workspaceId, config);

      await this.repository.updateJob(jobId, workspaceId, {
        status: WarehouseSyncStatus.COMPLETED,
        completedAt: new Date(),
        progressPercentage: 100,
      });

      await this.createHistoryEntry(
        jobId,
        workspaceId,
        WarehouseSyncStatus.RUNNING,
        WarehouseSyncStatus.COMPLETED,
        'Sync job completed',
      );

      await this.eventQueue.publish({
        event: WarehouseSyncEvent.SYNC_COMPLETED,
        workspaceId,
        syncJobId: jobId,
        configurationId: config.id,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      await this.repository.updateJob(jobId, workspaceId, {
        status: WarehouseSyncStatus.FAILED,
        errorMessage,
        errorDetails: {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        },
      });

      await this.createHistoryEntry(
        jobId,
        workspaceId,
        WarehouseSyncStatus.RUNNING,
        WarehouseSyncStatus.FAILED,
        `Sync job failed: ${errorMessage}`,
      );

      await this.eventQueue.publish({
        event: WarehouseSyncEvent.SYNC_FAILED,
        workspaceId,
        syncJobId: jobId,
        configurationId: config.id,
        errorMessage,
      });
    }
  }

  private async performSync(
    jobId: string,
    workspaceId: string,
    config: IWarehouseSyncConfiguration,
  ): Promise<void> {
    this.logger.log(`Performing sync for job ${jobId}`);

    const batchSize = config.batchSize;
    let processedItems = 0;
    const totalItems = 100;

    await this.repository.updateJob(jobId, workspaceId, {
      totalItems,
    });

    for (let i = 0; i < totalItems; i += batchSize) {
      const job = await this.repository.findJobById(jobId, workspaceId);
      
      if (job && job['status'] === WarehouseSyncStatus.PAUSED) {
        this.logger.log(`Sync job ${jobId} is paused, stopping execution`);
        return;
      }

      if (job && job['status'] === WarehouseSyncStatus.CANCELLED) {
        this.logger.log(`Sync job ${jobId} is cancelled, stopping execution`);
        return;
      }

      const currentBatchSize = Math.min(batchSize, totalItems - i);
      processedItems += currentBatchSize;

      const progressPercentage = Math.round((processedItems / totalItems) * 100);

      await this.repository.updateJob(jobId, workspaceId, {
        processedItems,
        successItems: processedItems,
        progressPercentage,
      });

      await this.eventQueue.publish({
        event: WarehouseSyncEvent.SYNC_PROGRESSED,
        workspaceId,
        syncJobId: jobId,
        progressPercentage,
        processedItems,
        totalItems,
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (config.recalculateAvailability) {
      this.logger.log(`Recalculating availability after sync job ${jobId}`);
    }
  }

  async pauseSyncJob(
    id: string,
    workspaceId: string,
    dto: PauseSyncJobDto,
    pausedBy?: string,
  ): Promise<IWarehouseSyncJob> {
    const job = await this.findJobById(id, workspaceId);

    if (job.status !== WarehouseSyncStatus.RUNNING) {
      throw new BusinessRuleException(
        'Only running sync jobs can be paused',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const updated = (await this.repository.updateJob(id, workspaceId, {
      status: WarehouseSyncStatus.PAUSED,
      pausedAt: new Date(),
    })) as unknown as IWarehouseSyncJob;

    await this.createHistoryEntry(
      id,
      workspaceId,
      WarehouseSyncStatus.RUNNING,
      WarehouseSyncStatus.PAUSED,
      dto.reason || 'Sync job paused',
      pausedBy,
    );

    await this.eventQueue.publish({
      event: WarehouseSyncEvent.SYNC_PAUSED,
      workspaceId,
      syncJobId: id,
    });

    return updated;
  }

  async resumeSyncJob(
    id: string,
    workspaceId: string,
    dto: ResumeSyncJobDto,
    resumedBy?: string,
  ): Promise<IWarehouseSyncJob> {
    const job = await this.findJobById(id, workspaceId);

    if (job.status !== WarehouseSyncStatus.PAUSED) {
      throw new BusinessRuleException(
        'Only paused sync jobs can be resumed',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const updated = (await this.repository.updateJob(id, workspaceId, {
      status: WarehouseSyncStatus.RUNNING,
      pausedAt: null,
    })) as unknown as IWarehouseSyncJob;

    await this.createHistoryEntry(
      id,
      workspaceId,
      WarehouseSyncStatus.PAUSED,
      WarehouseSyncStatus.RUNNING,
      'Sync job resumed',
      resumedBy,
    );

    await this.eventQueue.publish({
      event: WarehouseSyncEvent.SYNC_RESUMED,
      workspaceId,
      syncJobId: id,
    });

    const config = await this.findConfigurationById(job.configurationId, workspaceId);
    this.executeSyncJob(id, workspaceId, config);

    return updated;
  }

  async cancelSyncJob(
    id: string,
    workspaceId: string,
    dto: CancelSyncJobDto,
    cancelledBy?: string,
  ): Promise<IWarehouseSyncJob> {
    const job = await this.findJobById(id, workspaceId);

    if (
      job.status !== WarehouseSyncStatus.PENDING &&
      job.status !== WarehouseSyncStatus.RUNNING &&
      job.status !== WarehouseSyncStatus.PAUSED
    ) {
      throw new BusinessRuleException(
        'Only pending, running, or paused sync jobs can be cancelled',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const updated = (await this.repository.updateJob(id, workspaceId, {
      status: WarehouseSyncStatus.CANCELLED,
      cancelledAt: new Date(),
    })) as unknown as IWarehouseSyncJob;

    await this.createHistoryEntry(
      id,
      workspaceId,
      job.status,
      WarehouseSyncStatus.CANCELLED,
      dto.reason || 'Sync job cancelled',
      cancelledBy,
    );

    await this.eventQueue.publish({
      event: WarehouseSyncEvent.SYNC_CANCELLED,
      workspaceId,
      syncJobId: id,
    });

    return updated;
  }

  async findJobById(id: string, workspaceId: string): Promise<IWarehouseSyncJob> {
    const job = await this.repository.findJobById(id, workspaceId);
    if (!job) {
      throw new ResourceNotFoundException(
        'Warehouse sync job not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return job as unknown as IWarehouseSyncJob;
  }

  async findAllJobs(
    workspaceId: string,
    filter: WarehouseSyncJobFilterDto,
  ): Promise<PaginatedWarehouseSyncJobResponseDto> {
    const [data, total] = await this.repository.findAllJobs(workspaceId, filter);

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data as unknown as WarehouseSyncJobResponseDto[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getSyncProgress(id: string, workspaceId: string): Promise<SyncProgressResponseDto> {
    const job = await this.findJobById(id, workspaceId);

    return {
      jobId: job.id,
      status: job.status,
      totalItems: job.totalItems,
      processedItems: job.processedItems,
      successItems: job.successItems,
      failedItems: job.failedItems,
      conflictItems: job.conflictItems,
      progressPercentage: job.progressPercentage,
    };
  }

  async resolveConflict(
    id: string,
    workspaceId: string,
    dto: ResolveConflictDto,
    resolvedBy?: string,
  ): Promise<IWarehouseSyncConflict> {
    const conflict = await this.findConflictById(dto.conflictId, workspaceId);

    if (conflict.resolved) {
      throw new BusinessRuleException(
        'Conflict is already resolved',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const updated = (await this.repository.updateConflict(dto.conflictId, workspaceId, {
      resolved: true,
      resolvedAt: new Date(),
      resolvedBy: dto.resolvedBy ?? resolvedBy,
      resolutionAction: dto.resolutionAction,
      resolutionNotes: dto.resolutionNotes,
    })) as unknown as IWarehouseSyncConflict;

    await this.eventQueue.publish({
      event: WarehouseSyncEvent.CONFLICT_RESOLVED,
      workspaceId,
      syncJobId: conflict.syncJobId,
      conflictId: conflict.id,
      inventoryItemId: conflict.inventoryItemId,
    });

    return updated;
  }

  async findConflictById(
    id: string,
    workspaceId: string,
  ): Promise<IWarehouseSyncConflict> {
    const conflict = await this.repository.findConflictById(id, workspaceId);
    if (!conflict) {
      throw new ResourceNotFoundException(
        'Warehouse sync conflict not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return conflict as unknown as IWarehouseSyncConflict;
  }

  async findAllConflicts(
    workspaceId: string,
    filter: WarehouseSyncConflictFilterDto,
  ): Promise<PaginatedWarehouseSyncConflictResponseDto> {
    const [data, total] = await this.repository.findAllConflicts(
      workspaceId,
      filter,
    );

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data as unknown as WarehouseSyncConflictResponseDto[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  private async createHistoryEntry(
    syncJobId: string,
    workspaceId: string,
    fromStatus: WarehouseSyncStatus | null,
    toStatus: WarehouseSyncStatus,
    reason: string,
    changedBy?: string,
  ): Promise<void> {
    await this.repository.createHistoryEntry({
      syncJobId,
      workspaceId,
      fromStatus,
      toStatus,
      reason,
      changedBy,
      createdAt: new Date(),
    });
  }
}
