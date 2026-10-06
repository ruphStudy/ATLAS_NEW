import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  WarehouseSyncConfigurationFilterDto,
  WarehouseSyncJobFilterDto,
  WarehouseSyncConflictFilterDto,
} from './dto';

const SYNC_CONFIG_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  name: 'name',
  priority: 'priority',
};

const SYNC_JOB_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  startedAt: 'startedAt',
  completedAt: 'completedAt',
  progressPercentage: 'progressPercentage',
};

const SYNC_CONFLICT_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
};

@Injectable()
export class WarehouseSyncRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get configModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'warehouseSyncConfiguration'
    ] as Record<string, unknown>;
  }

  private get jobModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'warehouseSyncJob'
    ] as Record<string, unknown>;
  }

  private get historyModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'warehouseSyncHistory'
    ] as Record<string, unknown>;
  }

  private get conflictModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'warehouseSyncConflict'
    ] as Record<string, unknown>;
  }

  private callConfig<T>(method: string, args: unknown): Promise<T> {
    return (this.configModel[method] as (a: unknown) => Promise<T>)(args);
  }

  private callJob<T>(method: string, args: unknown): Promise<T> {
    return (this.jobModel[method] as (a: unknown) => Promise<T>)(args);
  }

  private callHistory<T>(method: string, args: unknown): Promise<T> {
    return (this.historyModel[method] as (a: unknown) => Promise<T>)(args);
  }

  private callConflict<T>(method: string, args: unknown): Promise<T> {
    return (this.conflictModel[method] as (a: unknown) => Promise<T>)(args);
  }

  async createConfiguration(
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.callConfig<Record<string, unknown>>('create', { data });
  }

  async findConfigurationById(
    id: string,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.callConfig<Record<string, unknown> | null>('findFirst', {
      where: { id, workspaceId, deletedAt: null },
    });
  }

  async findConfigurationByWarehouses(
    workspaceId: string,
    sourceWarehouseId: string,
    targetWarehouseId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.callConfig<Record<string, unknown> | null>('findFirst', {
      where: {
        workspaceId,
        sourceWarehouseId,
        targetWarehouseId,
        deletedAt: null,
      },
    });
  }

  async findAllConfigurations(
    workspaceId: string,
    filter: WarehouseSyncConfigurationFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      workspaceId,
      deletedAt: null,
    };

    if (filter.sourceWarehouseId)
      where['sourceWarehouseId'] = filter.sourceWarehouseId;
    if (filter.targetWarehouseId)
      where['targetWarehouseId'] = filter.targetWarehouseId;
    if (filter.enabled !== undefined) where['enabled'] = filter.enabled;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const sortBy = 'createdAt';
    const sortOrder = 'desc';

    const [data, total] = await Promise.all([
      this.callConfig<Record<string, unknown>[]>('findMany', {
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.callConfig<number>('count', { where }),
    ]);

    return [data, total];
  }

  async updateConfiguration(
    id: string,
    workspaceId: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.callConfig<Record<string, unknown>>('update', {
      where: { id, workspaceId },
      data,
    });
  }

  async deleteConfiguration(id: string, workspaceId: string): Promise<void> {
    await this.callConfig('update', {
      where: { id, workspaceId },
      data: { deletedAt: new Date() },
    });
  }

  async getNextJobSequence(workspaceId: string): Promise<number> {
    const lastJob = await this.callJob<Record<string, unknown> | null>(
      'findFirst',
      {
        where: { workspaceId },
        orderBy: { jobSequence: 'desc' },
      },
    );
    return lastJob ? ((lastJob['jobSequence'] as number) || 0) + 1 : 1;
  }

  async createJob(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.callJob<Record<string, unknown>>('create', { data });
  }

  async findJobById(
    id: string,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.callJob<Record<string, unknown> | null>('findFirst', {
      where: { id, workspaceId },
    });
  }

  async findAllJobs(
    workspaceId: string,
    filter: WarehouseSyncJobFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      workspaceId,
    };

    if (filter.configurationId) where['configurationId'] = filter.configurationId;
    if (filter.status) where['status'] = filter.status;
    if (filter.syncType) where['syncType'] = filter.syncType;
    if (filter.sourceWarehouseId)
      where['sourceWarehouseId'] = filter.sourceWarehouseId;
    if (filter.targetWarehouseId)
      where['targetWarehouseId'] = filter.targetWarehouseId;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const sortBy = 'createdAt';
    const sortOrder = 'desc';

    const [data, total] = await Promise.all([
      this.callJob<Record<string, unknown>[]>('findMany', {
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.callJob<number>('count', { where }),
    ]);

    return [data, total];
  }

  async updateJob(
    id: string,
    workspaceId: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.callJob<Record<string, unknown>>('update', {
      where: { id, workspaceId },
      data,
    });
  }

  async createHistoryEntry(
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.callHistory<Record<string, unknown>>('create', { data });
  }

  async createConflict(
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.callConflict<Record<string, unknown>>('create', { data });
  }

  async findConflictById(
    id: string,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.callConflict<Record<string, unknown> | null>('findFirst', {
      where: { id, workspaceId },
    });
  }

  async findAllConflicts(
    workspaceId: string,
    filter: WarehouseSyncConflictFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      workspaceId,
    };

    if (filter.syncJobId) where['syncJobId'] = filter.syncJobId;
    if (filter.inventoryItemId) where['inventoryItemId'] = filter.inventoryItemId;
    if (filter.resolved !== undefined) where['resolved'] = filter.resolved;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const sortBy = 'createdAt';
    const sortOrder = 'desc';

    const [data, total] = await Promise.all([
      this.callConflict<Record<string, unknown>[]>('findMany', {
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.callConflict<number>('count', { where }),
    ]);

    return [data, total];
  }

  async updateConflict(
    id: string,
    workspaceId: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.callConflict<Record<string, unknown>>('update', {
      where: { id, workspaceId },
      data,
    });
  }

  async findActiveJobByConfiguration(
    configurationId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.callJob<Record<string, unknown> | null>('findFirst', {
      where: {
        configurationId,
        workspaceId,
        status: { in: ['PENDING', 'RUNNING', 'PAUSED'] },
      },
    });
  }
}
