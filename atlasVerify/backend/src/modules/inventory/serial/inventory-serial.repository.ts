import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import type { InventorySerialFilterDto } from '../dto';
import { INVENTORY_SERIAL_SORT_FIELDS } from '../constants';

@Injectable()
export class InventorySerialRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get model() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'inventorySerial'
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

  async findBySerialNumber(
    serialNumber: string,
    inventoryItemId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { serialNumber, inventoryItemId, deletedAt: null },
    });
  }

  async findAll(
    inventoryItemId: string,
    workspaceId: string,
    filter: InventorySerialFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      inventoryItemId,
      workspaceId,
      deletedAt: null,
      ...(filter.status && { status: filter.status }),
      ...(filter.batchId && { batchId: filter.batchId }),
      ...(filter.warehouseId && { warehouseId: filter.warehouseId }),
    };

    if (filter.search) {
      where['serialNumber'] = { contains: filter.search, mode: 'insensitive' };
    }

    const sortField = INVENTORY_SERIAL_SORT_FIELDS[filter.sortBy ?? 'createdAt'] ?? 'createdAt';
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

  async softDelete(id: string): Promise<void> {
    await this.call<unknown>('update', {
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
