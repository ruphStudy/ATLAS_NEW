import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { IOrderSyncJob, OrderSyncJobFilter, SyncItemStatus } from '../interfaces';

@Injectable()
export class OrderSyncRepository {
  private readonly jobModel: string = 'MarketplaceOrderSyncJob';
  private readonly scheduleModel: string = 'MarketplaceOrderSyncSchedule';
  private readonly itemResultModel: string = 'MarketplaceOrderSyncItemResult';
  private readonly externalRefModel: string = 'ExternalOrderRef';
  private readonly conflictModel: string = 'MarketplaceOrderSyncConflict';

  constructor(private readonly prisma: PrismaService) {}

  async createJob(data: Partial<IOrderSyncJob>) {
    return (this.prisma as any)[this.jobModel].create({ data });
  }

  async updateJob(jobId: string, workspaceId: string, data: Partial<IOrderSyncJob>) {
    return (this.prisma as any)[this.jobModel].update({
      where: { id_workspaceId: { id: jobId, workspaceId } },
      data,
    });
  }

  async incrementJobCounters(jobId: string, counters: {
    processedItems?: number;
    importedOrders?: number;
    updatedOrders?: number;
    cancelledOrders?: number;
    failedItems?: number;
    conflictItems?: number;
    skippedItems?: number;
  }) {
    const data: Record<string, { increment: number }> = {};
    for (const [key, val] of Object.entries(counters)) {
      if (val != null && val > 0) data[key] = { increment: val };
    }
    if (Object.keys(data).length === 0) return null;
    return (this.prisma as any)[this.jobModel].update({
      where: { id: jobId },
      data,
    });
  }

  async findJobById(jobId: string, workspaceId: string) {
    return (this.prisma as any)[this.jobModel].findUnique({
      where: { id_workspaceId: { id: jobId, workspaceId } },
    });
  }

  async findJobs(filter: OrderSyncJobFilter): Promise<[unknown[], number]> {
    const where: Record<string, unknown> = { workspaceId: filter.workspaceId };
    if (filter.accountId) where['accountId'] = filter.accountId;
    if (filter.providerKey) where['providerKey'] = filter.providerKey;
    if (filter.marketplaceKey) where['marketplaceKey'] = filter.marketplaceKey;
    if (filter.status) where['status'] = filter.status;
    if (filter.trigger) where['trigger'] = filter.trigger;
    if (filter.scheduleId) where['scheduleId'] = filter.scheduleId;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      (this.prisma as any)[this.jobModel].findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      (this.prisma as any)[this.jobModel].count({ where }),
    ]);

    return [items, total];
  }

  async bulkCreateItemResults(items: Record<string, unknown>[]) {
    return (this.prisma as any)[this.itemResultModel].createMany({ data: items, skipDuplicates: true });
  }

  async findItemResults(jobId: string, workspaceId: string, opts?: { page?: number; limit?: number; status?: string | null }) {
    const where: Record<string, unknown> = { jobId, workspaceId };
    if (opts?.status) where['status'] = opts.status;

    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      (this.prisma as any)[this.itemResultModel].findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      (this.prisma as any)[this.itemResultModel].count({ where }),
    ]);

    return [items, total];
  }

  async findFailedItemResults(jobId: string, workspaceId: string) {
    return (this.prisma as any)[this.itemResultModel].findMany({
      where: { jobId, workspaceId, status: SyncItemStatus.FAILED, retryable: true },
    });
  }

  async upsertExternalRef(data: {
    workspaceId: string;
    accountId: string;
    externalOrderId: string;
    internalOrderId?: string | null;
    orderNumber?: string | null;
    providerKey: string;
    marketplaceKey: string;
    itemType: string;
    status?: string | null;
    lastSyncedAt?: Date;
    checksum?: string | null;
    metadata?: Record<string, unknown> | null;
  }) {
    return (this.prisma as any)[this.externalRefModel].upsert({
      where: {
        workspaceId_accountId_externalOrderId: {
          workspaceId: data.workspaceId,
          accountId: data.accountId,
          externalOrderId: data.externalOrderId,
        },
      },
      update: {
        internalOrderId: data.internalOrderId,
        orderNumber: data.orderNumber,
        status: data.status,
        lastSyncedAt: data.lastSyncedAt,
        checksum: data.checksum,
        metadata: data.metadata,
      },
      create: data,
    });
  }

  async findExternalRefs(workspaceId: string, accountId: string, opts?: { status?: string | null; page?: number; limit?: number }) {
    const where: Record<string, unknown> = { workspaceId, accountId };
    if (opts?.status) where['status'] = opts.status;

    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      (this.prisma as any)[this.externalRefModel].findMany({
        where,
        orderBy: { lastSyncedAt: 'desc' },
        skip,
        take: limit,
      }),
      (this.prisma as any)[this.externalRefModel].count({ where }),
    ]);

    return [items, total];
  }

  async findExternalRefByOrderId(workspaceId: string, accountId: string, externalOrderId: string) {
    return (this.prisma as any)[this.externalRefModel].findUnique({
      where: {
        workspaceId_accountId_externalOrderId: { workspaceId, accountId, externalOrderId },
      },
    });
  }

  async createConflict(data: {
    workspaceId: string;
    jobId: string;
    accountId: string;
    externalOrderId: string;
    internalOrderId?: string | null;
    conflictType: string;
    marketplaceValue: Record<string, unknown> | null;
    atlasValue: Record<string, unknown> | null;
    resolved: boolean;
    resolution?: string | null;
    resolvedBy?: string | null;
    resolvedAt?: Date | null;
    notes?: string | null;
  }) {
    return (this.prisma as any)[this.conflictModel].create({ data });
  }

  async findConflicts(workspaceId: string, opts?: { jobId?: string | null; accountId?: string | null; resolved?: boolean | null; page?: number; limit?: number }) {
    const where: Record<string, unknown> = { workspaceId };
    if (opts?.jobId) where['jobId'] = opts.jobId;
    if (opts?.accountId) where['accountId'] = opts.accountId;
    if (opts?.resolved != null) where['resolved'] = opts.resolved;

    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      (this.prisma as any)[this.conflictModel].findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      (this.prisma as any)[this.conflictModel].count({ where }),
    ]);

    return [items, total];
  }

  async resolveConflict(conflictId: string, workspaceId: string, resolution: string, resolvedBy?: string, notes?: string) {
    return (this.prisma as any)[this.conflictModel].update({
      where: { id_workspaceId: { id: conflictId, workspaceId } },
      data: {
        resolved: true,
        resolution,
        resolvedBy,
        resolvedAt: new Date(),
        notes,
      },
    });
  }

  async createSchedule(data: {
    workspaceId: string;
    accountId: string;
    providerKey: string;
    marketplaceKey: string;
    direction: string;
    scope: string;
    itemType: string;
    conflictStrategy: string | null;
    intervalMs: number;
    enabled: boolean;
    nextRunAt: Date;
    filterOptions: Record<string, unknown> | null;
    createdBy: string | null;
    updatedBy: string | null;
  }) {
    return (this.prisma as any)[this.scheduleModel].create({ data });
  }

  async updateSchedule(scheduleId: string, data: Record<string, unknown>) {
    return (this.prisma as any)[this.scheduleModel].update({
      where: { id: scheduleId },
      data,
    });
  }

  async softDeleteSchedule(scheduleId: string, workspaceId: string) {
    return (this.prisma as any)[this.scheduleModel].update({
      where: { id_workspaceId: { id: scheduleId, workspaceId } },
      data: { deletedAt: new Date() },
    });
  }

  async findScheduleById(scheduleId: string, workspaceId: string) {
    return (this.prisma as any)[this.scheduleModel].findUnique({
      where: { id_workspaceId: { id: scheduleId, workspaceId } },
    });
  }

  async findSchedulesByWorkspace(workspaceId: string) {
    return (this.prisma as any)[this.scheduleModel].findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findScheduleByAccount(workspaceId: string, accountId: string, direction: string, itemType: string) {
    return (this.prisma as any)[this.scheduleModel].findFirst({
      where: { workspaceId, accountId, direction, itemType, deletedAt: null },
    });
  }
}
