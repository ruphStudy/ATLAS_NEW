import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { ConflictResolutionStrategy, ItemSyncStatus, SyncDirection, SyncMode, SyncStatus } from '../interfaces';

@Injectable()
export class PriceSyncRepository extends BaseRepository {
  private readonly jobModel = 'MarketplacePriceSyncJob';
  private readonly scheduleModel = 'MarketplacePriceSyncSchedule';
  private readonly itemResultModel = 'MarketplacePriceSyncItemResult';
  private readonly externalRefModel = 'ExternalPriceRef';
  private readonly conflictModel = 'MarketplacePriceSyncConflict';

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async createJob(data: {
    workspaceId: string;
    accountId: string;
    providerKey: string;
    marketplaceKey: string;
    direction: SyncDirection;
    mode: SyncMode;
    itemType: string;
    metadata?: Record<string, any>;
  }) {
    return (this.prisma as any)[this.jobModel].create({
      data: {
        ...data,
        status: SyncStatus.PENDING,
        totalItems: 0,
        processedItems: 0,
        successCount: 0,
        failedCount: 0,
        skippedCount: 0,
        conflictCount: 0,
      },
    });
  }

  async updateJob(id: string, workspaceId: string, data: Partial<any>) {
    return (this.prisma as any)[this.jobModel].update({
      where: { id_workspaceId: { id, workspaceId } },
      data,
    });
  }

  async getJob(id: string, workspaceId: string) {
    return (this.prisma as any)[this.jobModel].findUnique({
      where: { id_workspaceId: { id, workspaceId } },
    });
  }

  async findJobs(filter: {
    workspaceId: string;
    accountId?: string;
    status?: SyncStatus;
    direction?: SyncDirection;
    mode?: SyncMode;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 20, workspaceId, ...where } = filter;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      (this.prisma as any)[this.jobModel].findMany({
        where: { workspaceId, ...where },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any)[this.jobModel].count({
        where: { workspaceId, ...where },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createSchedule(data: {
    workspaceId: string;
    accountId: string;
    providerKey: string;
    marketplaceKey: string;
    direction: SyncDirection;
    mode: SyncMode;
    itemType: string;
    cronExpression: string;
    isActive: boolean;
    conflictStrategy: ConflictResolutionStrategy;
    metadata?: Record<string, any>;
  }) {
    return (this.prisma as any)[this.scheduleModel].create({ data });
  }

  async updateSchedule(id: string, workspaceId: string, data: Partial<any>) {
    return (this.prisma as any)[this.scheduleModel].update({
      where: { id_workspaceId: { id, workspaceId } },
      data,
    });
  }

  async deleteSchedule(id: string, workspaceId: string) {
    return (this.prisma as any)[this.scheduleModel].delete({
      where: { id_workspaceId: { id, workspaceId } },
    });
  }

  async getSchedules(workspaceId: string, accountId?: string) {
    return (this.prisma as any)[this.scheduleModel].findMany({
      where: { workspaceId, ...(accountId && { accountId }) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createItemResult(data: {
    jobId: string;
    workspaceId: string;
    externalPriceId: string;
    sku?: string;
    status: ItemSyncStatus;
    operation?: string;
    errorMessage?: string;
    metadata?: Record<string, any>;
  }) {
    return (this.prisma as any)[this.itemResultModel].create({ data });
  }

  async updateItemResult(id: string, workspaceId: string, data: Partial<any>) {
    return (this.prisma as any)[this.itemResultModel].update({
      where: { id_workspaceId: { id, workspaceId } },
      data,
    });
  }

  async getItemResults(jobId: string, workspaceId: string, filter?: {
    status?: ItemSyncStatus;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 50, status } = filter || {};
    const skip = (page - 1) * limit;

    const where = { jobId, workspaceId, ...(status && { status }) };

    const [items, total] = await Promise.all([
      (this.prisma as any)[this.itemResultModel].findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any)[this.itemResultModel].count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async upsertExternalRef(data: {
    workspaceId: string;
    accountId: string;
    externalPriceId: string;
    externalOfferId?: string;
    atlasListingId?: string;
    atlasPriceId?: string;
    sku?: string;
    variantId?: string;
    marketplaceId?: string;
    countryCode?: string;
    lastSyncedAt: Date;
    checksum?: string;
    metadata?: Record<string, any>;
  }) {
    return (this.prisma as any)[this.externalRefModel].upsert({
      where: {
        workspaceId_accountId_externalPriceId: {
          workspaceId: data.workspaceId,
          accountId: data.accountId,
          externalPriceId: data.externalPriceId,
        },
      },
      create: data,
      update: data,
    });
  }

  async getExternalRef(workspaceId: string, accountId: string, externalPriceId: string) {
    return (this.prisma as any)[this.externalRefModel].findUnique({
      where: {
        workspaceId_accountId_externalPriceId: {
          workspaceId,
          accountId,
          externalPriceId,
        },
      },
    });
  }

  async getExternalRefs(workspaceId: string, accountId: string, filter?: {
    sku?: string;
    marketplaceId?: string;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 50, ...where } = filter || {};
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      (this.prisma as any)[this.externalRefModel].findMany({
        where: { workspaceId, accountId, ...where },
        skip,
        take: limit,
        orderBy: { lastSyncedAt: 'desc' },
      }),
      (this.prisma as any)[this.externalRefModel].count({
        where: { workspaceId, accountId, ...where },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createConflict(data: {
    workspaceId: string;
    accountId: string;
    jobId: string;
    externalPriceId: string;
    sku?: string;
    conflictType: string;
    marketplaceData: Record<string, any>;
    atlasData: Record<string, any>;
    isResolved: boolean;
    metadata?: Record<string, any>;
  }) {
    return (this.prisma as any)[this.conflictModel].create({ data });
  }

  async updateConflict(id: string, workspaceId: string, data: Partial<any>) {
    return (this.prisma as any)[this.conflictModel].update({
      where: { id_workspaceId: { id, workspaceId } },
      data,
    });
  }

  async getConflicts(workspaceId: string, filter?: {
    accountId?: string;
    jobId?: string;
    isResolved?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 50, ...where } = filter || {};
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      (this.prisma as any)[this.conflictModel].findMany({
        where: { workspaceId, ...where },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any)[this.conflictModel].count({
        where: { workspaceId, ...where },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getMetrics(workspaceId: string, accountId?: string) {
    const where = { workspaceId, ...(accountId && { accountId }) };

    const [
      totalJobs,
      completedJobs,
      failedJobs,
      activeJobs,
      totalItemsProcessed,
      totalConflicts,
      unresolvedConflicts,
    ] = await Promise.all([
      (this.prisma as any)[this.jobModel].count({ where }),
      (this.prisma as any)[this.jobModel].count({
        where: { ...where, status: SyncStatus.COMPLETED },
      }),
      (this.prisma as any)[this.jobModel].count({
        where: { ...where, status: SyncStatus.FAILED },
      }),
      (this.prisma as any)[this.jobModel].count({
        where: { ...where, status: SyncStatus.RUNNING },
      }),
      (this.prisma as any)[this.jobModel].aggregate({
        where,
        _sum: { processedItems: true },
      }),
      (this.prisma as any)[this.conflictModel].count({ where }),
      (this.prisma as any)[this.conflictModel].count({
        where: { ...where, isResolved: false },
      }),
    ]);

    return {
      totalJobs,
      completedJobs,
      failedJobs,
      activeJobs,
      totalItemsProcessed: totalItemsProcessed._sum.processedItems || 0,
      totalConflicts,
      unresolvedConflicts,
    };
  }
}
