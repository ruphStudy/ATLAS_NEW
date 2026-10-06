import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import type { WarehouseLocationFilterDto } from './dto';
import { WAREHOUSE_LOCATION_SORT_FIELDS } from './constants';

@Injectable()
export class WarehouseLocationRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get model() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'warehouseLocation'
    ] as Record<string, unknown>;
  }

  private get historyModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'warehouseLocationHistory'
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

  async findById(
    id: string,
    warehouseId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { id, warehouseId, workspaceId, deletedAt: null },
    });
  }

  async findByCode(
    code: string,
    warehouseId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { code, warehouseId, deletedAt: null },
    });
  }

  async findAll(
    warehouseId: string,
    workspaceId: string,
    filter: WarehouseLocationFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      warehouseId,
      workspaceId,
      deletedAt: null,
      ...(filter.status && { status: filter.status }),
      ...(filter.type && { type: filter.type }),
      ...(filter.parentLocationId && { parentLocationId: filter.parentLocationId }),
      ...(filter.zone && { zone: { contains: filter.zone, mode: 'insensitive' } }),
      ...(filter.barcode && { barcode: filter.barcode }),
    };

    if (filter.search) {
      where['OR'] = [
        { code: { contains: filter.search, mode: 'insensitive' } },
        { name: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const sortField =
      WAREHOUSE_LOCATION_SORT_FIELDS[filter.sortBy ?? 'createdAt'] ?? 'createdAt';
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

  async restore(id: string): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('update', {
      where: { id },
      data: { deletedAt: null },
    });
  }

  async hasChildren(id: string): Promise<boolean> {
    const count = await this.call<number>('count', {
      where: { parentLocationId: id, deletedAt: null },
    });
    return count > 0;
  }

  async hasActiveInventory(id: string): Promise<boolean> {
    const stockModel = (this.prisma as unknown as Record<string, unknown>)[
      'inventoryStock'
    ] as Record<string, unknown>;
    const count = await (stockModel['count'] as (a: unknown) => Promise<number>)({
      where: {
        locationId: id,
        quantity: { gt: 0 },
      },
    });
    return count > 0;
  }

  async createHistoryEntry(data: Record<string, unknown>): Promise<void> {
    await this.callHistory<unknown>('create', { data });
  }

  async findHistory(locationId: string, workspaceId: string): Promise<Record<string, unknown>[]> {
    return this.callHistory<Record<string, unknown>[]>('findMany', {
      where: { locationId, workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
