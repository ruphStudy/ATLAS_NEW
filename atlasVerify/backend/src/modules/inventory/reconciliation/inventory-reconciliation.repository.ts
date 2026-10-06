import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import type {
  InventoryReconciliationLineFilterDto,
  InventoryReconciliationRunFilterDto,
} from '../dto';
import {
  INVENTORY_RECONCILIATION_LINE_SORT_FIELDS,
  INVENTORY_RECONCILIATION_RUN_SORT_FIELDS,
} from '../constants';

@Injectable()
export class InventoryReconciliationRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get runModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'inventoryReconciliationRun'
    ] as Record<string, unknown>;
  }

  private get lineModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'inventoryReconciliationLine'
    ] as Record<string, unknown>;
  }

  private get runHistoryModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'inventoryReconciliationHistory'
    ] as Record<string, unknown>;
  }

  private get lineHistoryModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'inventoryReconciliationLineHistory'
    ] as Record<string, unknown>;
  }

  private callRun<T>(method: string, args: unknown): Promise<T> {
    return (this.runModel[method] as (a: unknown) => Promise<T>)(args);
  }

  private callLine<T>(method: string, args: unknown): Promise<T> {
    return (this.lineModel[method] as (a: unknown) => Promise<T>)(args);
  }

  private callRunHistory<T>(method: string, args: unknown): Promise<T> {
    return (this.runHistoryModel[method] as (a: unknown) => Promise<T>)(args);
  }

  private callLineHistory<T>(method: string, args: unknown): Promise<T> {
    return (this.lineHistoryModel[method] as (a: unknown) => Promise<T>)(args);
  }

  // ── Run ──────────────────────────────────────────────────────

  async createRun(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.callRun<Record<string, unknown>>('create', { data });
  }

  async findRunById(id: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.callRun<Record<string, unknown> | null>('findFirst', {
      where: { id, workspaceId },
    });
  }

  async findRunByIdempotencyKey(
    workspaceId: string,
    idempotencyKey: string,
  ): Promise<Record<string, unknown> | null> {
    return this.callRun<Record<string, unknown> | null>('findFirst', {
      where: { workspaceId, idempotencyKey },
    });
  }

  /** Guards against duplicate reconciliation runs for the same scope and period. */
  async findActiveRunByScopeAndPeriod(
    workspaceId: string,
    sourceType: string,
    inventoryItemId: string | null,
    scopeWarehouseId: string | null,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<Record<string, unknown> | null> {
    return this.callRun<Record<string, unknown> | null>('findFirst', {
      where: {
        workspaceId,
        sourceType,
        inventoryItemId,
        scopeWarehouseId,
        periodStart,
        periodEnd,
        status: { not: 'CANCELLED' },
      },
    });
  }

  async findAllRuns(
    workspaceId: string,
    filter: InventoryReconciliationRunFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      workspaceId,
      ...(filter.status && { status: filter.status }),
      ...(filter.sourceType && { sourceType: filter.sourceType }),
      ...(filter.trigger && { trigger: filter.trigger }),
      ...(filter.inventoryItemId && { inventoryItemId: filter.inventoryItemId }),
      ...(filter.warehouseId && { scopeWarehouseId: filter.warehouseId }),
      ...(filter.idempotencyKey && { idempotencyKey: filter.idempotencyKey }),
    };

    const sortField =
      INVENTORY_RECONCILIATION_RUN_SORT_FIELDS[filter.sortBy ?? 'createdAt'] ?? 'createdAt';
    const orderBy = { [sortField]: filter.sortOrder ?? 'desc' };

    const [items, total] = await Promise.all([
      this.callRun<Record<string, unknown>[]>('findMany', {
        where,
        orderBy,
        skip: filter.skip,
        take: filter.limit,
      }),
      this.callRun<number>('count', { where }),
    ]);

    return [items, total];
  }

  async updateRun(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.callRun<Record<string, unknown>>('update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  // ── Lines ────────────────────────────────────────────────────

  async createLine(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.callLine<Record<string, unknown>>('create', { data });
  }

  async findLineById(id: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.callLine<Record<string, unknown> | null>('findFirst', {
      where: { id, workspaceId },
    });
  }

  async findLines(
    runId: string,
    workspaceId: string,
    filter?: InventoryReconciliationLineFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      runId,
      workspaceId,
      ...(filter?.classification && { classification: filter.classification }),
      ...(filter?.findingStatus && { findingStatus: filter.findingStatus }),
      ...(filter?.varianceType && { varianceType: filter.varianceType }),
      ...(filter?.warehouseId && { warehouseId: filter.warehouseId }),
    };

    const sortField =
      INVENTORY_RECONCILIATION_LINE_SORT_FIELDS[filter?.sortBy ?? 'createdAt'] ?? 'createdAt';
    const orderBy = { [sortField]: filter?.sortOrder ?? 'desc' };

    const [items, total] = await Promise.all([
      this.callLine<Record<string, unknown>[]>('findMany', {
        where,
        orderBy,
        ...(filter && { skip: filter.skip, take: filter.limit }),
      }),
      this.callLine<number>('count', { where }),
    ]);

    return [items, total];
  }

  async updateLine(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.callLine<Record<string, unknown>>('update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  // ── History ──────────────────────────────────────────────────

  async createRunHistoryEntry(data: Record<string, unknown>): Promise<void> {
    await this.callRunHistory<unknown>('create', { data });
  }

  async findRunHistory(runId: string, workspaceId: string): Promise<Record<string, unknown>[]> {
    return this.callRunHistory<Record<string, unknown>[]>('findMany', {
      where: { runId, workspaceId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createLineHistoryEntry(data: Record<string, unknown>): Promise<void> {
    await this.callLineHistory<unknown>('create', { data });
  }

  async findLineHistory(lineId: string, workspaceId: string): Promise<Record<string, unknown>[]> {
    return this.callLineHistory<Record<string, unknown>[]>('findMany', {
      where: { lineId, workspaceId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
