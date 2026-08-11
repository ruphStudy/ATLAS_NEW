import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import type { InventoryAllocationFilterDto } from '../dto';
import { INVENTORY_ALLOCATION_SORT_FIELDS } from '../constants';

@Injectable()
export class InventoryAllocationRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get model() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'inventoryAllocation'
    ] as Record<string, unknown>;
  }

  private get lineModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'inventoryAllocationLine'
    ] as Record<string, unknown>;
  }

  private get historyModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'inventoryAllocationHistory'
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

  // ── Allocation ───────────────────────────────────────────────

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

  /** Guards against duplicate/over-allocation for the same demand line (e.g. same order + item). */
  async findActiveBySourceReference(
    workspaceId: string,
    inventoryItemId: string,
    sourceReferenceType: string,
    sourceReferenceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: {
        workspaceId,
        inventoryItemId,
        sourceReferenceType,
        sourceReferenceId,
        status: { notIn: ['RELEASED', 'CANCELLED'] },
      },
    });
  }

  async findAll(
    workspaceId: string,
    filter: InventoryAllocationFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      workspaceId,
      ...(filter.status && { status: filter.status }),
      ...(filter.source && { source: filter.source }),
      ...(filter.sourceReferenceType && { sourceReferenceType: filter.sourceReferenceType }),
      ...(filter.sourceReferenceId && { sourceReferenceId: filter.sourceReferenceId }),
      ...(filter.idempotencyKey && { idempotencyKey: filter.idempotencyKey }),
      ...(filter.warehouseId && { lines: { some: { warehouseId: filter.warehouseId } } }),
    };

    const sortField = INVENTORY_ALLOCATION_SORT_FIELDS[filter.sortBy ?? 'createdAt'] ?? 'createdAt';
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

  async findLines(
    allocationId: string,
    workspaceId: string,
    status?: string,
  ): Promise<Record<string, unknown>[]> {
    return this.callLine<Record<string, unknown>[]>('findMany', {
      where: { allocationId, workspaceId, ...(status && { status }) },
      orderBy: { createdAt: 'asc' },
    });
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

  async findHistory(allocationId: string, workspaceId: string): Promise<Record<string, unknown>[]> {
    return this.callHistory<Record<string, unknown>[]>('findMany', {
      where: { allocationId, workspaceId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
