import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { IShipmentSyncJob, ShipmentSyncJobFilter, SyncItemStatus } from '../interfaces';

@Injectable()
export class ShipmentSyncRepository {
  private readonly jobModel: string = 'MarketplaceShipmentSyncJob';
  private readonly scheduleModel: string = 'MarketplaceShipmentSyncSchedule';
  private readonly itemResultModel: string = 'MarketplaceShipmentSyncItemResult';
  private readonly externalRefModel: string = 'ExternalShipmentRef';
  private readonly conflictModel: string = 'MarketplaceShipmentSyncConflict';

  constructor(private readonly prisma: PrismaService) {}

  async createJob(data: Partial<IShipmentSyncJob>) {
    return (this.prisma as any)[this.jobModel].create({ data });
  }

  async updateJob(jobId: string, workspaceId: string, data: Partial<IShipmentSyncJob>) {
    return (this.prisma as any)[this.jobModel].update({
      where: { id_workspaceId: { id: jobId, workspaceId } },
      data,
    });
  }

  async incrementJobCounters(jobId: string, counters: {
    processedItems?: number;
    importedShipments?: number;
    updatedShipments?: number;
    cancelledShipments?: number;
    deliveredShipments?: number;
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

  async findJobs(filter: ShipmentSyncJobFilter): Promise<[unknown[], number]> {
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
    externalShipmentId: string;
    internalShipmentId?: string | null;
    externalOrderId?: string | null;
    trackingNumber?: string | null;
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
        workspaceId_accountId_externalShipmentId: {
          workspaceId: data.workspaceId,
          accountId: data.accountId,
          externalShipmentId: data.externalShipmentId,
        },
      },
      update: {
        internalShipmentId: data.internalShipmentId,
        externalOrderId: data.externalOrderId,
        trackingNumber: data.trackingNumber,
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

  async findExternalRefByShipmentId(workspaceId: string, accountId: string, externalShipmentId: string) {
    return (this.prisma as any)[this.externalRefModel].findUnique({
      where: {
        workspaceId_accountId_externalShipmentId: {
          workspaceId,
          accountId,
          externalShipmentId,
        },
      },
    });
  }

  async createSchedule(data: Record<string, unknown>) {
    return (this.prisma as any)[this.scheduleModel].create({ data });
  }

  async updateSchedule(scheduleId: string, workspaceId: string, data: Record<string, unknown>) {
    return (this.prisma as any)[this.scheduleModel].update({
      where: { id_workspaceId: { id: scheduleId, workspaceId } },
      data,
    });
  }

  async findScheduleById(scheduleId: string, workspaceId: string) {
    return (this.prisma as any)[this.scheduleModel].findUnique({
      where: { id_workspaceId: { id: scheduleId, workspaceId } },
    });
  }

  async findSchedules(workspaceId: string, opts?: { accountId?: string; enabled?: boolean }) {
    const where: Record<string, unknown> = { workspaceId, deletedAt: null };
    if (opts?.accountId) where['accountId'] = opts.accountId;
    if (opts?.enabled !== undefined) where['enabled'] = opts.enabled;

    return (this.prisma as any)[this.scheduleModel].findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteSchedule(scheduleId: string, workspaceId: string) {
    return (this.prisma as any)[this.scheduleModel].update({
      where: { id_workspaceId: { id: scheduleId, workspaceId } },
      data: { deletedAt: new Date() },
    });
  }

  async createConflict(data: {
    jobId: string;
    workspaceId: string;
    accountId: string;
    externalShipmentId: string;
    internalShipmentId?: string | null;
    conflictType: string;
    details: Record<string, unknown>;
    resolution?: string | null;
    resolvedBy?: string | null;
    resolvedAt?: Date | null;
  }) {
    return (this.prisma as any)[this.conflictModel].create({ data });
  }

  async findConflicts(workspaceId: string, opts?: { accountId?: string; resolved?: boolean; page?: number; limit?: number }) {
    const where: Record<string, unknown> = { workspaceId };
    if (opts?.accountId) where['accountId'] = opts.accountId;
    if (opts?.resolved !== undefined) {
      where['resolvedAt'] = opts.resolved ? { not: null } : null;
    }

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

  async resolveConflict(conflictId: string, workspaceId: string, resolution: string, resolvedBy: string, notes?: string) {
    return (this.prisma as any)[this.conflictModel].update({
      where: { id_workspaceId: { id: conflictId, workspaceId } },
      data: {
        resolution,
        resolvedBy,
        resolvedAt: new Date(),
        notes: notes ?? null,
      },
    });
  }
}
