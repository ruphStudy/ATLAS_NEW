import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { BaseRepository } from '@database/base.repository';
import { WarehouseZoneFilterDto } from './dto';

const ZONE_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  code: 'code',
  name: 'name',
  status: 'status',
  type: 'type',
  priority: 'priority',
};

@Injectable()
export class WarehouseZoneRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get model() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'warehouseZone'
    ] as Record<string, unknown>;
  }

  private get historyModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'warehouseZoneHistory'
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
    filter: WarehouseZoneFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      warehouseId,
      workspaceId,
      deletedAt: null,
      ...(filter.status && { status: filter.status }),
      ...(filter.type && { type: filter.type }),
    };

    if (filter.search) {
      where['OR'] = [
        { code: { contains: filter.search, mode: 'insensitive' } },
        { name: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const sortField = ZONE_SORT_FIELDS[filter.sortBy ?? 'priority'] ?? 'priority';
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
      data,
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

  async hasActiveStock(id: string): Promise<boolean> {
    const locationModel = (this.prisma as unknown as Record<string, unknown>)[
      'warehouseLocation'
    ] as Record<string, unknown>;
    const binModel = (this.prisma as unknown as Record<string, unknown>)[
      'warehouseBin'
    ] as Record<string, unknown>;
    const stockModel = (this.prisma as unknown as Record<string, unknown>)[
      'inventoryStock'
    ] as Record<string, unknown>;

    // Check stock in locations assigned to this zone
    const locationIds = await (
      locationModel['findMany'] as (a: unknown) => Promise<{ id: string }[]>
    )({
      where: { zoneId: id, deletedAt: null },
      select: { id: true },
    });

    if (locationIds.length > 0) {
      const locationStockCount = await (
        stockModel['count'] as (a: unknown) => Promise<number>
      )({
        where: {
          locationId: { in: locationIds.map((l) => l.id) },
          quantity: { gt: 0 },
        },
      });
      if (locationStockCount > 0) return true;
    }

    // Check stock in bins assigned to this zone
    const binIds = await (binModel['findMany'] as (a: unknown) => Promise<{ id: string }[]>)({
      where: { zoneId: id, deletedAt: null },
      select: { id: true },
    });

    if (binIds.length > 0) {
      const binStockCount = await (stockModel['count'] as (a: unknown) => Promise<number>)({
        where: {
          binId: { in: binIds.map((b) => b.id) },
          quantity: { gt: 0 },
        },
      });
      if (binStockCount > 0) return true;
    }

    return false;
  }

  async hasPendingOperations(id: string): Promise<boolean> {
    const locationModel = (this.prisma as unknown as Record<string, unknown>)[
      'warehouseLocation'
    ] as Record<string, unknown>;
    const binModel = (this.prisma as unknown as Record<string, unknown>)[
      'warehouseBin'
    ] as Record<string, unknown>;
    const transferModel = (this.prisma as unknown as Record<string, unknown>)[
      'inventoryTransfer'
    ] as Record<string, unknown>;

    // Get all location and bin IDs in this zone
    const locationIds = await (
      locationModel['findMany'] as (a: unknown) => Promise<{ id: string }[]>
    )({
      where: { zoneId: id, deletedAt: null },
      select: { id: true },
    });

    const binIds = await (binModel['findMany'] as (a: unknown) => Promise<{ id: string }[]>)({
      where: { zoneId: id, deletedAt: null },
      select: { id: true },
    });

    const allLocationIds = locationIds.map((l) => l.id);
    const allBinIds = binIds.map((b) => b.id);

    if (allLocationIds.length === 0 && allBinIds.length === 0) return false;

    // Check for pending transfers
    const count = await (transferModel['count'] as (a: unknown) => Promise<number>)({
      where: {
        OR: [
          {
            lines: {
              some: {
                OR: [
                  ...(allLocationIds.length > 0
                    ? [
                        { fromLocationId: { in: allLocationIds } },
                        { toLocationId: { in: allLocationIds } },
                      ]
                    : []),
                  ...(allBinIds.length > 0
                    ? [{ fromBinId: { in: allBinIds } }, { toBinId: { in: allBinIds } }]
                    : []),
                ],
              },
            },
          },
        ],
        status: { in: ['PENDING', 'APPROVED', 'DISPATCHED', 'IN_TRANSIT'] },
      },
    });

    return count > 0;
  }

  async createHistoryEntry(data: Record<string, unknown>): Promise<void> {
    await this.callHistory<unknown>('create', { data });
  }

  async findHistory(zoneId: string, workspaceId: string): Promise<Record<string, unknown>[]> {
    return this.callHistory<Record<string, unknown>[]>('findMany', {
      where: { zoneId, workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
