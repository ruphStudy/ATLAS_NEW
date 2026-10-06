import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { SyncJobStatus, SyncDirection, InventoryItemType } from '../interfaces';

@Injectable()
export class InventorySyncRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get jobs() {
    return (this.prisma as unknown as Record<string, unknown>)['marketplaceInventorySyncJob'] as any;
  }
  private get itemResults() {
    return (this.prisma as unknown as Record<string, unknown>)['marketplaceInventorySyncItemResult'] as any;
  }
  private get schedules() {
    return (this.prisma as unknown as Record<string, unknown>)['marketplaceInventorySyncSchedule'] as any;
  }
  private get conflicts() {
    return (this.prisma as unknown as Record<string, unknown>)['marketplaceInventorySyncConflict'] as any;
  }
  private get externalRefs() {
    return (this.prisma as unknown as Record<string, unknown>)['marketplaceInventoryExternalRef'] as any;
  }
  private get adjustments() {
    return (this.prisma as unknown as Record<string, unknown>)['marketplaceInventoryAdjustment'] as any;
  }

  // ── Jobs ────────────────────────────────────────────────────

  async createJob(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.jobs.create({ data });
  }

  async findJobById(jobId: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.jobs.findFirst({ where: { id: jobId, workspaceId, deletedAt: null } });
  }

  async findJobByCorrelationId(correlationId: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.jobs.findFirst({ where: { correlationId, workspaceId, deletedAt: null } });
  }

  async findActiveJob(workspaceId: string, accountId: string, direction: SyncDirection): Promise<Record<string, unknown> | null> {
    return this.jobs.findFirst({
      where: {
        workspaceId,
        accountId,
        direction,
        status: { in: [SyncJobStatus.PENDING, SyncJobStatus.QUEUED, SyncJobStatus.PROCESSING] },
        deletedAt: null,
      },
    });
  }

  async findJobs(filter: {
    workspaceId: string;
    accountId?: string | null;
    providerKey?: string | null;
    marketplaceKey?: string | null;
    warehouseId?: string | null;
    status?: SyncJobStatus | null;
    direction?: SyncDirection | null;
    page?: number;
    limit?: number;
  }): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = { workspaceId: filter.workspaceId, deletedAt: null };
    if (filter.accountId) where['accountId'] = filter.accountId;
    if (filter.providerKey) where['providerKey'] = filter.providerKey;
    if (filter.marketplaceKey) where['marketplaceKey'] = filter.marketplaceKey;
    if (filter.warehouseId) where['warehouseId'] = filter.warehouseId;
    if (filter.status) where['status'] = filter.status;
    if (filter.direction) where['direction'] = filter.direction;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.jobs.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.jobs.count({ where }),
    ]);
    return [items, total];
  }

  async updateJob(jobId: string, workspaceId: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.jobs.update({ where: { id: jobId }, data });
  }

  async incrementJobCounters(jobId: string, counters: Partial<{
    processedItems: number; pushedItems: number; pulledItems: number;
    adjustedItems: number; reconciledItems: number;
    failedItems: number; conflictItems: number; skippedItems: number;
  }>): Promise<void> {
    const inc: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(counters)) {
      if (v) inc[k] = { increment: v };
    }
    if (Object.keys(inc).length) {
      await this.jobs.update({ where: { id: jobId }, data: inc });
    }
  }

  async softDeleteJob(jobId: string, workspaceId: string): Promise<void> {
    await this.jobs.update({ where: { id: jobId }, data: { deletedAt: new Date() } });
  }

  // ── Item Results ─────────────────────────────────────────────

  async createItemResult(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.itemResults.create({ data });
  }

  async bulkCreateItemResults(items: Record<string, unknown>[]): Promise<void> {
    if (!items.length) return;
    await this.itemResults.createMany({ data: items, skipDuplicates: true });
  }

  async findItemResults(
    jobId: string,
    workspaceId: string,
    opts?: { page?: number; limit?: number; status?: string | null },
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = { jobId, workspaceId };
    if (opts?.status) where['status'] = opts.status;
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 50;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.itemResults.findMany({ where, orderBy: { createdAt: 'asc' }, skip, take: limit }),
      this.itemResults.count({ where }),
    ]);
    return [items, total];
  }

  async findFailedItemResults(jobId: string, workspaceId: string): Promise<Record<string, unknown>[]> {
    return this.itemResults.findMany({
      where: { jobId, workspaceId, status: 'FAILED', retryable: true },
    });
  }

  // ── External Refs ─────────────────────────────────────────────

  async upsertExternalRef(data: {
    workspaceId: string; accountId: string; providerKey: string; marketplaceKey: string;
    warehouseId?: string | null; externalId: string; externalSku?: string | null;
    internalId?: string | null; internalSku?: string | null;
    status: string; available?: number; reserved?: number; incoming?: number; safetyStock?: number;
    lastSyncedAt: Date; lastJobId: string; checksum?: string | null;
  }): Promise<Record<string, unknown>> {
    const existing = await this.externalRefs.findFirst({
      where: {
        workspaceId: data.workspaceId,
        accountId: data.accountId,
        externalId: data.externalId,
        deletedAt: null,
      },
    });
    if (existing) {
      return this.externalRefs.update({
        where: { id: existing['id'] },
        data: {
          externalSku: data.externalSku,
          internalId: data.internalId,
          internalSku: data.internalSku,
          warehouseId: data.warehouseId,
          status: data.status,
          available: data.available ?? existing['available'],
          reserved: data.reserved ?? existing['reserved'],
          incoming: data.incoming ?? existing['incoming'],
          safetyStock: data.safetyStock ?? existing['safetyStock'],
          lastSyncedAt: data.lastSyncedAt,
          lastJobId: data.lastJobId,
          checksum: data.checksum,
        },
      });
    }
    return this.externalRefs.create({
      data: {
        workspaceId: data.workspaceId,
        accountId: data.accountId,
        providerKey: data.providerKey,
        marketplaceKey: data.marketplaceKey,
        warehouseId: data.warehouseId ?? null,
        externalId: data.externalId,
        externalSku: data.externalSku ?? null,
        internalId: data.internalId ?? null,
        internalSku: data.internalSku ?? null,
        status: data.status,
        available: data.available ?? 0,
        reserved: data.reserved ?? 0,
        incoming: data.incoming ?? 0,
        safetyStock: data.safetyStock ?? 0,
        lastSyncedAt: data.lastSyncedAt,
        lastJobId: data.lastJobId,
        checksum: data.checksum ?? null,
      },
    });
  }

  async findExternalRef(workspaceId: string, accountId: string, externalId: string): Promise<Record<string, unknown> | null> {
    return this.externalRefs.findFirst({
      where: { workspaceId, accountId, externalId, deletedAt: null },
    });
  }

  async findExternalRefByInternalId(workspaceId: string, accountId: string, internalId: string): Promise<Record<string, unknown> | null> {
    return this.externalRefs.findFirst({
      where: { workspaceId, accountId, internalId, deletedAt: null },
    });
  }

  async findExternalRefs(
    workspaceId: string,
    accountId: string,
    opts?: { warehouseId?: string | null; page?: number; limit?: number },
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = { workspaceId, accountId, deletedAt: null };
    if (opts?.warehouseId) where['warehouseId'] = opts.warehouseId;
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 50;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.externalRefs.findMany({ where, orderBy: { updatedAt: 'desc' }, skip, take: limit }),
      this.externalRefs.count({ where }),
    ]);
    return [items, total];
  }

  async softDeleteExternalRef(id: string, workspaceId: string): Promise<void> {
    await this.externalRefs.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // ── Conflicts ─────────────────────────────────────────────────

  async createConflict(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.conflicts.create({ data });
  }

  async findConflicts(
    workspaceId: string,
    opts?: { jobId?: string | null; accountId?: string | null; resolved?: boolean | null; page?: number; limit?: number },
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = { workspaceId };
    if (opts?.jobId) where['jobId'] = opts.jobId;
    if (opts?.accountId) where['accountId'] = opts.accountId;
    if (opts?.resolved === true) where['resolvedAt'] = { not: null };
    if (opts?.resolved === false) where['resolvedAt'] = null;
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 20;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.conflicts.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.conflicts.count({ where }),
    ]);
    return [items, total];
  }

  async resolveConflict(
    conflictId: string,
    workspaceId: string,
    resolution: string,
    resolvedBy?: string,
    notes?: string,
  ): Promise<Record<string, unknown>> {
    return this.conflicts.update({
      where: { id: conflictId },
      data: {
        resolution,
        resolvedBy: resolvedBy ?? null,
        resolvedAt: new Date(),
        notes: notes ?? null,
      },
    });
  }

  // ── Adjustments ───────────────────────────────────────────────

  async createAdjustment(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.adjustments.create({ data });
  }

  async bulkCreateAdjustments(items: Record<string, unknown>[]): Promise<void> {
    if (!items.length) return;
    await this.adjustments.createMany({ data: items, skipDuplicates: true });
  }

  async findAdjustments(
    workspaceId: string,
    opts?: { accountId?: string | null; jobId?: string | null; status?: string | null; page?: number; limit?: number },
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = { workspaceId };
    if (opts?.accountId) where['accountId'] = opts.accountId;
    if (opts?.jobId) where['jobId'] = opts.jobId;
    if (opts?.status) where['status'] = opts.status;
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 50;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.adjustments.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.adjustments.count({ where }),
    ]);
    return [items, total];
  }

  async updateAdjustment(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.adjustments.update({ where: { id }, data });
  }

  // ── Schedules ─────────────────────────────────────────────────

  async createSchedule(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.schedules.create({ data });
  }

  async findScheduleById(scheduleId: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.schedules.findFirst({ where: { id: scheduleId, workspaceId, deletedAt: null } });
  }

  async findScheduleByAccount(
    workspaceId: string,
    accountId: string,
    direction: SyncDirection,
    itemType: InventoryItemType,
  ): Promise<Record<string, unknown> | null> {
    return this.schedules.findFirst({
      where: { workspaceId, accountId, direction, itemType, deletedAt: null },
    });
  }

  async findSchedulesByWorkspace(workspaceId: string): Promise<Record<string, unknown>[]> {
    return this.schedules.findMany({ where: { workspaceId, deletedAt: null }, orderBy: { createdAt: 'desc' } });
  }

  async findEnabledSchedules(): Promise<Record<string, unknown>[]> {
    return this.schedules.findMany({
      where: { enabled: true, deletedAt: null },
      orderBy: { nextRunAt: 'asc' },
    });
  }

  async updateSchedule(scheduleId: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.schedules.update({ where: { id: scheduleId }, data });
  }

  async softDeleteSchedule(scheduleId: string, workspaceId: string): Promise<void> {
    await this.schedules.update({ where: { id: scheduleId }, data: { deletedAt: new Date(), enabled: false } });
  }
}
