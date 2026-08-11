import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  ICatalogSyncConflict,
  IExternalRef,
  SyncJobFilter,
  SyncJobStatus,
} from '../interfaces';
import { MP_CATALOG_SYNC_CONSTANTS } from '../constants';

@Injectable()
export class CatalogSyncRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private model(name: string) {
    return (this.prisma as unknown as Record<string, unknown>)[name] as Record<string, unknown>;
  }

  private call<T>(model: string, method: string, args: unknown): Promise<T> {
    const m = this.model(model);
    return (m[method] as (a: unknown) => Promise<T>)(args);
  }

  // ── Jobs ──────────────────────────────────────────────────

  async createJob(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('marketplaceCatalogSyncJob', 'create', {
      data: { ...data, createdAt: new Date(), updatedAt: new Date() },
    });
  }

  async findJobById(id: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('marketplaceCatalogSyncJob', 'findFirst', {
      where: { id, workspaceId, deletedAt: null },
    });
  }

  async findJobByCorrelationId(correlationId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('marketplaceCatalogSyncJob', 'findFirst', {
      where: { correlationId, deletedAt: null },
    });
  }

  async findActiveJob(
    workspaceId: string,
    accountId: string,
    direction: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('marketplaceCatalogSyncJob', 'findFirst', {
      where: {
        workspaceId,
        accountId,
        direction,
        status: {
          in: [
            SyncJobStatus.PENDING,
            SyncJobStatus.QUEUED,
            SyncJobStatus.PROCESSING,
            SyncJobStatus.PAUSED,
          ],
        },
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findJobs(filter: SyncJobFilter): Promise<[Record<string, unknown>[], number]> {
    const where = this.buildJobWhere(filter);
    const take = Math.min(
      filter.limit ?? MP_CATALOG_SYNC_CONSTANTS.DEFAULT_PAGE_SIZE,
      MP_CATALOG_SYNC_CONSTANTS.MAX_PAGE_SIZE,
    );
    const skip = filter.page ? (filter.page - 1) * take : 0;

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('marketplaceCatalogSyncJob', 'findMany', {
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.call<number>('marketplaceCatalogSyncJob', 'count', { where }),
    ]);
    return [items, total];
  }

  async updateJob(
    id: string,
    workspaceId: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('marketplaceCatalogSyncJob', 'update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async incrementJobCounters(
    id: string,
    deltas: Partial<{
      processedItems: number;
      createdItems: number;
      updatedItems: number;
      deletedItems: number;
      failedItems: number;
      conflictItems: number;
      skippedItems: number;
    }>,
  ): Promise<void> {
    const data: Record<string, unknown> = { updatedAt: new Date() };
    for (const [key, val] of Object.entries(deltas)) {
      if (val) data[key] = { increment: val };
    }
    await this.call<void>('marketplaceCatalogSyncJob', 'update', { where: { id }, data });
  }

  async softDeleteJob(id: string, workspaceId: string): Promise<void> {
    await this.call<void>('marketplaceCatalogSyncJob', 'updateMany', {
      where: { id, workspaceId },
      data: { deletedAt: new Date(), updatedAt: new Date() },
    });
  }

  // ── Item Results ──────────────────────────────────────────

  async createItemResult(data: Record<string, unknown>): Promise<void> {
    await this.call<void>('marketplaceCatalogSyncItemResult', 'create', {
      data: { ...data, createdAt: new Date() },
    });
  }

  async bulkCreateItemResults(items: Record<string, unknown>[]): Promise<void> {
    if (items.length === 0) return;
    await this.call<void>('marketplaceCatalogSyncItemResult', 'createMany', {
      data: items.map((i) => ({ ...i, createdAt: new Date() })),
      skipDuplicates: true,
    });
  }

  async findItemResults(
    jobId: string,
    workspaceId: string,
    opts?: { page?: number; limit?: number; status?: string | null },
  ): Promise<[Record<string, unknown>[], number]> {
    const take = Math.min(opts?.limit ?? 50, 200);
    const skip = opts?.page ? (opts.page - 1) * take : 0;
    const where: Record<string, unknown> = { jobId, workspaceId };
    if (opts?.status) where['status'] = opts.status;

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('marketplaceCatalogSyncItemResult', 'findMany', {
        where,
        orderBy: { createdAt: 'asc' },
        take,
        skip,
      }),
      this.call<number>('marketplaceCatalogSyncItemResult', 'count', { where }),
    ]);
    return [items, total];
  }

  async findFailedItemResults(
    jobId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('marketplaceCatalogSyncItemResult', 'findMany', {
      where: { jobId, workspaceId, status: 'FAILED', retryable: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── External Refs ─────────────────────────────────────────

  async upsertExternalRef(data: {
    workspaceId: string;
    accountId: string;
    providerKey: string;
    marketplaceKey: string;
    refType: string;
    externalId: string;
    externalSku?: string | null;
    externalTitle?: string | null;
    internalId?: string | null;
    internalSku?: string | null;
    internalType?: string | null;
    status?: string;
    lastSyncedAt?: Date;
    lastJobId?: string | null;
    checksum?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<Record<string, unknown>> {
    const existing = await this.findExternalRef(
      data.workspaceId,
      data.accountId,
      data.refType,
      data.externalId,
    );

    if (existing) {
      return this.call<Record<string, unknown>>('marketplaceCatalogExternalRef', 'update', {
        where: { id: (existing as { id: string }).id },
        data: { ...data, updatedAt: new Date() },
      });
    }

    return this.call<Record<string, unknown>>('marketplaceCatalogExternalRef', 'create', {
      data: { ...data, createdAt: new Date(), updatedAt: new Date() },
    });
  }

  async findExternalRef(
    workspaceId: string,
    accountId: string,
    refType: string,
    externalId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('marketplaceCatalogExternalRef', 'findFirst', {
      where: { workspaceId, accountId, refType, externalId, deletedAt: null },
    });
  }

  async findExternalRefByInternalId(
    workspaceId: string,
    accountId: string,
    internalId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('marketplaceCatalogExternalRef', 'findMany', {
      where: { workspaceId, accountId, internalId, deletedAt: null },
    });
  }

  async findExternalRefs(
    workspaceId: string,
    accountId: string,
    opts?: { refType?: string | null; page?: number; limit?: number },
  ): Promise<[Record<string, unknown>[], number]> {
    const take = Math.min(opts?.limit ?? 50, 200);
    const skip = opts?.page ? (opts.page - 1) * take : 0;
    const where: Record<string, unknown> = { workspaceId, accountId, deletedAt: null };
    if (opts?.refType) where['refType'] = opts.refType;

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('marketplaceCatalogExternalRef', 'findMany', {
        where,
        orderBy: { updatedAt: 'desc' },
        take,
        skip,
      }),
      this.call<number>('marketplaceCatalogExternalRef', 'count', { where }),
    ]);
    return [items, total];
  }

  async softDeleteExternalRef(id: string, workspaceId: string): Promise<void> {
    await this.call<void>('marketplaceCatalogExternalRef', 'update', {
      where: { id },
      data: { deletedAt: new Date(), updatedAt: new Date() },
    });
  }

  // ── Conflict History ──────────────────────────────────────

  async createConflict(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('marketplaceCatalogSyncConflict', 'create', {
      data: { ...data, createdAt: new Date(), updatedAt: new Date() },
    });
  }

  async findConflicts(
    workspaceId: string,
    opts?: {
      jobId?: string | null;
      accountId?: string | null;
      resolved?: boolean | null;
      page?: number;
      limit?: number;
    },
  ): Promise<[Record<string, unknown>[], number]> {
    const take = Math.min(opts?.limit ?? 50, 200);
    const skip = opts?.page ? (opts.page - 1) * take : 0;
    const where: Record<string, unknown> = { workspaceId };
    if (opts?.jobId) where['jobId'] = opts.jobId;
    if (opts?.accountId) where['accountId'] = opts.accountId;
    if (opts?.resolved === true) where['resolvedAt'] = { not: null };
    if (opts?.resolved === false) where['resolvedAt'] = null;

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('marketplaceCatalogSyncConflict', 'findMany', {
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.call<number>('marketplaceCatalogSyncConflict', 'count', { where }),
    ]);
    return [items, total];
  }

  async resolveConflict(
    id: string,
    workspaceId: string,
    resolution: string,
    resolvedBy?: string,
    notes?: string,
  ): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('marketplaceCatalogSyncConflict', 'update', {
      where: { id },
      data: {
        resolution,
        resolvedBy: resolvedBy ?? null,
        resolvedAt: new Date(),
        notes: notes ?? null,
        updatedAt: new Date(),
      },
    });
  }

  // ── Schedules ─────────────────────────────────────────────

  async createSchedule(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('marketplaceCatalogSyncSchedule', 'create', {
      data: { ...data, createdAt: new Date(), updatedAt: new Date() },
    });
  }

  async findScheduleById(
    id: string,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('marketplaceCatalogSyncSchedule', 'findFirst', {
      where: { id, workspaceId, deletedAt: null },
    });
  }

  async findScheduleByAccount(
    workspaceId: string,
    accountId: string,
    direction: string,
    itemType: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('marketplaceCatalogSyncSchedule', 'findFirst', {
      where: { workspaceId, accountId, direction, itemType, deletedAt: null },
    });
  }

  async findEnabledSchedules(): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('marketplaceCatalogSyncSchedule', 'findMany', {
      where: { enabled: true, deletedAt: null },
    });
  }

  async findSchedulesByWorkspace(workspaceId: string): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('marketplaceCatalogSyncSchedule', 'findMany', {
      where: { workspaceId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateSchedule(
    id: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('marketplaceCatalogSyncSchedule', 'update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async softDeleteSchedule(id: string, workspaceId: string): Promise<void> {
    await this.call<void>('marketplaceCatalogSyncSchedule', 'updateMany', {
      where: { id, workspaceId },
      data: { deletedAt: new Date(), updatedAt: new Date() },
    });
  }

  // ── Helpers ───────────────────────────────────────────────

  private buildJobWhere(filter: SyncJobFilter): Record<string, unknown> {
    const where: Record<string, unknown> = { workspaceId: filter.workspaceId, deletedAt: null };
    if (filter.accountId) where['accountId'] = filter.accountId;
    if (filter.providerKey) where['providerKey'] = filter.providerKey.toUpperCase();
    if (filter.marketplaceKey) where['marketplaceKey'] = filter.marketplaceKey.toUpperCase();
    if (filter.status) where['status'] = filter.status;
    if (filter.direction) where['direction'] = filter.direction;
    if (filter.trigger) where['trigger'] = filter.trigger;
    if (filter.fromDate || filter.toDate) {
      where['createdAt'] = {
        ...(filter.fromDate && { gte: filter.fromDate }),
        ...(filter.toDate && { lte: filter.toDate }),
      };
    }
    return where;
  }
}


@Injectable()
export class CatalogSyncRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private model(name: string) {
    return (this.prisma as unknown as Record<string, unknown>)[name] as Record<string, unknown>;
  }

  private call<T>(model: string, method: string, args: unknown): Promise<T> {
    const m = this.model(model);
    return (m[method] as (a: unknown) => Promise<T>)(args);
  }

  // ── Jobs ──────────────────────────────────────────────────

  async createJob(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('marketplaceCatalogSyncJob', 'create', {
      data: { ...data, createdAt: new Date(), updatedAt: new Date() },
    });
  }

  async findJobById(id: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('marketplaceCatalogSyncJob', 'findFirst', {
      where: { id, workspaceId, deletedAt: null },
    });
  }

  async findJobByCorrelationId(correlationId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('marketplaceCatalogSyncJob', 'findFirst', {
      where: { correlationId, deletedAt: null },
    });
  }

  async findActiveJob(workspaceId: string, accountId: string, direction: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('marketplaceCatalogSyncJob', 'findFirst', {
      where: {
        workspaceId,
        accountId,
        direction,
        status: { in: [SyncJobStatus.PENDING, SyncJobStatus.RUNNING, SyncJobStatus.PAUSED] },
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findJobs(filter: SyncJobFilter): Promise<[Record<string, unknown>[], number]> {
    const where = this.buildJobWhere(filter);
    const take = Math.min(filter.limit ?? MP_CATALOG_SYNC_CONSTANTS.DEFAULT_PAGE_SIZE, MP_CATALOG_SYNC_CONSTANTS.MAX_PAGE_SIZE);
    const skip = filter.page ? (filter.page - 1) * take : 0;

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('marketplaceCatalogSyncJob', 'findMany', {
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.call<number>('marketplaceCatalogSyncJob', 'count', { where }),
    ]);
    return [items, total];
  }

  async updateJob(id: string, workspaceId: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('marketplaceCatalogSyncJob', 'update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async incrementJobCounters(
    id: string,
    deltas: Partial<{
      processedItems: number;
      createdItems: number;
      updatedItems: number;
      deletedItems: number;
      failedItems: number;
      conflictItems: number;
      skippedItems: number;
    }>,
  ): Promise<void> {
    const data: Record<string, unknown> = { updatedAt: new Date() };
    for (const [key, val] of Object.entries(deltas)) {
      if (val) data[key] = { increment: val };
    }
    await this.call<void>('marketplaceCatalogSyncJob', 'update', { where: { id }, data });
  }

  async softDeleteJob(id: string, workspaceId: string): Promise<void> {
    await this.call<void>('marketplaceCatalogSyncJob', 'updateMany', {
      where: { id, workspaceId },
      data: { deletedAt: new Date(), updatedAt: new Date() },
    });
  }

  // ── Item Results ──────────────────────────────────────────

  async createItemResult(data: Record<string, unknown>): Promise<void> {
    await this.call<void>('marketplaceCatalogSyncItemResult', 'create', {
      data: { ...data, createdAt: new Date() },
    });
  }

  async bulkCreateItemResults(items: Record<string, unknown>[]): Promise<void> {
    if (items.length === 0) return;
    await this.call<void>('marketplaceCatalogSyncItemResult', 'createMany', {
      data: items.map((i) => ({ ...i, createdAt: new Date() })),
      skipDuplicates: true,
    });
  }

  async findItemResults(
    jobId: string,
    workspaceId: string,
    opts?: { page?: number; limit?: number; status?: string | null },
  ): Promise<[Record<string, unknown>[], number]> {
    const take = Math.min(opts?.limit ?? 50, 200);
    const skip = opts?.page ? (opts.page - 1) * take : 0;
    const where: Record<string, unknown> = { jobId, workspaceId };
    if (opts?.status) where['status'] = opts.status;

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('marketplaceCatalogSyncItemResult', 'findMany', {
        where,
        orderBy: { createdAt: 'asc' },
        take,
        skip,
      }),
      this.call<number>('marketplaceCatalogSyncItemResult', 'count', { where }),
    ]);
    return [items, total];
  }

  // ── Schedules ─────────────────────────────────────────────

  async createSchedule(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('marketplaceCatalogSyncSchedule', 'create', {
      data: { ...data, createdAt: new Date(), updatedAt: new Date() },
    });
  }

  async findScheduleById(id: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('marketplaceCatalogSyncSchedule', 'findFirst', {
      where: { id, workspaceId, deletedAt: null },
    });
  }

  async findScheduleByAccount(
    workspaceId: string,
    accountId: string,
    direction: string,
    itemType: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('marketplaceCatalogSyncSchedule', 'findFirst', {
      where: { workspaceId, accountId, direction, itemType, deletedAt: null },
    });
  }

  async findEnabledSchedules(): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('marketplaceCatalogSyncSchedule', 'findMany', {
      where: { enabled: true, deletedAt: null },
    });
  }

  async findSchedulesByWorkspace(workspaceId: string): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('marketplaceCatalogSyncSchedule', 'findMany', {
      where: { workspaceId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateSchedule(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('marketplaceCatalogSyncSchedule', 'update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async softDeleteSchedule(id: string, workspaceId: string): Promise<void> {
    await this.call<void>('marketplaceCatalogSyncSchedule', 'updateMany', {
      where: { id, workspaceId },
      data: { deletedAt: new Date(), updatedAt: new Date() },
    });
  }

  // ── Helpers ───────────────────────────────────────────────

  private buildJobWhere(filter: SyncJobFilter): Record<string, unknown> {
    const where: Record<string, unknown> = { workspaceId: filter.workspaceId, deletedAt: null };
    if (filter.accountId) where['accountId'] = filter.accountId;
    if (filter.providerKey) where['providerKey'] = filter.providerKey.toUpperCase();
    if (filter.marketplaceKey) where['marketplaceKey'] = filter.marketplaceKey.toUpperCase();
    if (filter.status) where['status'] = filter.status;
    if (filter.direction) where['direction'] = filter.direction;
    if (filter.trigger) where['trigger'] = filter.trigger;
    if (filter.fromDate || filter.toDate) {
      where['createdAt'] = {
        ...(filter.fromDate && { gte: filter.fromDate }),
        ...(filter.toDate && { lte: filter.toDate }),
      };
    }
    return where;
  }
}
