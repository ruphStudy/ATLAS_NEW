import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import type {
  InventoryCycleCountFilterDto,
  InventoryCycleCountLineFilterDto,
} from '../dto';
import {
  INVENTORY_CYCLE_COUNT_LINE_SORT_FIELDS,
  INVENTORY_CYCLE_COUNT_SORT_FIELDS,
} from '../constants';

@Injectable()
export class InventoryCycleCountRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get model() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'inventoryCycleCount'
    ] as Record<string, unknown>;
  }

  private get lineModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'inventoryCycleCountLine'
    ] as Record<string, unknown>;
  }

  private get historyModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'inventoryCycleCountHistory'
    ] as Record<string, unknown>;
  }

  private call<T>(method: string, args: unknown): Promise<T> {
    return (this.model[method] as (a: unknown) => Promise<T>)(args);
  }

  private callLine<T>(method: string, args: unknown): Promise<T> {
    return (this.lineModel[method] as (a: unknown) => Promise<T>)(args);
  }

  private callHistory<T>(method: string, args: unknown): Promise<T> {
    return (this.historyModel[method] as (a: unknown) => Promise<T>)(args);
  }

  // ── Cycle count ──────────────────────────────────────────────

  async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('create', { data });
  }

  async findById(id: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { id, workspaceId },
    });
  }

  async findByIdempotencyKey(
    workspaceId: string,
    idempotencyKey: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { workspaceId, idempotencyKey },
    });
  }

  /** Guards against duplicate active cycle counts for the same scope. */
  async findActiveByScope(
    workspaceId: string,
    scopeWarehouseId: string | null,
    scopeLocationId: string | null,
    scopeInventoryItemId: string | null,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: {
        workspaceId,
        scopeWarehouseId,
        scopeLocationId,
        scopeInventoryItemId,
        status: { notIn: ['APPROVED', 'REJECTED', 'CANCELLED'] },
      },
    });
  }

  async findAll(
    workspaceId: string,
    filter: InventoryCycleCountFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      workspaceId,
      ...(filter.status && { status: filter.status }),
      ...(filter.type && { type: filter.type }),
      ...(filter.warehouseId && { scopeWarehouseId: filter.warehouseId }),
      ...(filter.assignedTo && { assignedTo: filter.assignedTo }),
      ...(filter.idempotencyKey && { idempotencyKey: filter.idempotencyKey }),
    };

    const sortField = INVENTORY_CYCLE_COUNT_SORT_FIELDS[filter.sortBy ?? 'createdAt'] ?? 'createdAt';
    const orderBy = { [sortField]: filter.sortOrder ?? 'desc' };

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('findMany', {
        where,
        orderBy,
        skip: filter.skip,
        take: filter.limit,
      }),
      this.call<number>('count', { where }),
    ]);

    return [items, total];
  }

  async update(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('update', {
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
    cycleCountId: string,
    workspaceId: string,
    filter?: InventoryCycleCountLineFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      cycleCountId,
      workspaceId,
      ...(filter?.lineStatus && { lineStatus: filter.lineStatus }),
      ...(filter?.warehouseId && { warehouseId: filter.warehouseId }),
    };

    const sortField =
      INVENTORY_CYCLE_COUNT_LINE_SORT_FIELDS[filter?.sortBy ?? 'createdAt'] ?? 'createdAt';
    const orderBy = { [sortField]: filter?.sortOrder ?? 'asc' };

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

  async createHistoryEntry(data: Record<string, unknown>): Promise<void> {
    await this.callHistory<unknown>('create', { data });
  }

  async findHistory(cycleCountId: string, workspaceId: string): Promise<Record<string, unknown>[]> {
    return this.callHistory<Record<string, unknown>[]>('findMany', {
      where: { cycleCountId, workspaceId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
