import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import type { InventoryBatchFilterDto } from '../dto';
import { INVENTORY_BATCH_SORT_FIELDS } from '../constants';

@Injectable()
export class InventoryBatchRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get model() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'inventoryBatch'
    ] as Record<string, unknown>;
  }

  private call<T>(method: string, args: unknown): Promise<T> {
    return (this.model[method] as (a: unknown) => Promise<T>)(args);
  }

  async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('create', { data });
  }

  async findById(
    id: string,
    inventoryItemId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { id, inventoryItemId, workspaceId, deletedAt: null },
    });
  }

  async findByWorkspaceId(id: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { id, workspaceId, deletedAt: null },
    });
  }

  async findByBatchNumber(
    batchNumber: string,
    inventoryItemId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { batchNumber, inventoryItemId, deletedAt: null },
    });
  }

  async findAll(
    inventoryItemId: string,
    workspaceId: string,
    filter: InventoryBatchFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      inventoryItemId,
      workspaceId,
      deletedAt: null,
      ...(filter.expiringBefore && { expiryDate: { lte: new Date(filter.expiringBefore) } }),
    };

    if (filter.search) {
      where['OR'] = [
        { batchNumber: { contains: filter.search, mode: 'insensitive' } },
        { supplierId: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const sortField = INVENTORY_BATCH_SORT_FIELDS[filter.sortBy ?? 'expiryDate'] ?? 'expiryDate';
    const orderBy = { [sortField]: filter.sortOrder ?? 'asc' };

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

  async findExpiring(
    workspaceId: string,
    beforeDate: Date,
  ): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('findMany', {
      where: { workspaceId, deletedAt: null, expiryDate: { lte: beforeDate, not: null } },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async update(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async incrementQuantity(id: string, delta: number): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('update', {
      where: { id },
      data: { quantity: { increment: delta }, updatedAt: new Date() },
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.call<unknown>('update', {
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
