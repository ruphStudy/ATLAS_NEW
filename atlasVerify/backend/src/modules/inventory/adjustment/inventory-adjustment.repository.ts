import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import type { InventoryAdjustmentFilterDto } from '../dto';
import { INVENTORY_ADJUSTMENT_SORT_FIELDS } from '../constants';

@Injectable()
export class InventoryAdjustmentRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get model() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'inventoryAdjustment'
    ] as Record<string, unknown>;
  }

  private get historyModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'inventoryAdjustmentHistory'
    ] as Record<string, unknown>;
  }

  private call<T>(method: string, args: unknown): Promise<T> {
    return (this.model[method] as (a: unknown) => Promise<T>)(args);
  }

  private callHistory<T>(method: string, args: unknown): Promise<T> {
    return (this.historyModel[method] as (a: unknown) => Promise<T>)(args);
  }

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

  async findAll(
    workspaceId: string,
    filter: InventoryAdjustmentFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      workspaceId,
      ...(filter.status && { status: filter.status }),
      ...(filter.type && { type: filter.type }),
      ...(filter.warehouseId && { warehouseId: filter.warehouseId }),
      ...(filter.sourceReferenceType && { sourceReferenceType: filter.sourceReferenceType }),
      ...(filter.sourceReferenceId && { sourceReferenceId: filter.sourceReferenceId }),
      ...(filter.idempotencyKey && { idempotencyKey: filter.idempotencyKey }),
    };

    if (filter.search) {
      where['OR'] = [
        { sku: { contains: filter.search, mode: 'insensitive' } },
        { reason: { contains: filter.search, mode: 'insensitive' } },
        { notes: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const sortField = INVENTORY_ADJUSTMENT_SORT_FIELDS[filter.sortBy ?? 'createdAt'] ?? 'createdAt';
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

  async createHistoryEntry(data: Record<string, unknown>): Promise<void> {
    await this.callHistory<unknown>('create', { data });
  }

  async findHistory(adjustmentId: string, workspaceId: string): Promise<Record<string, unknown>[]> {
    return this.callHistory<Record<string, unknown>[]>('findMany', {
      where: { adjustmentId, workspaceId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
