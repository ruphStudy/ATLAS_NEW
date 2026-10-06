import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { BaseRepository } from '@database/base.repository';
import { WarehouseBinFilterDto } from './dto';

const BIN_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  code: 'code',
  name: 'name',
  status: 'status',
  type: 'type',
  mode: 'mode',
};

@Injectable()
export class WarehouseBinRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get model() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'warehouseBin'
    ] as Record<string, unknown>;
  }

  private get historyModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'warehouseBinHistory'
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
    filter: WarehouseBinFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      warehouseId,
      workspaceId,
      deletedAt: null,
      ...(filter.status && { status: filter.status }),
      ...(filter.type && { type: filter.type }),
      ...(filter.mode && { mode: filter.mode }),
      ...(filter.locationId && { locationId: filter.locationId }),
      ...(filter.zone && { zone: { contains: filter.zone, mode: 'insensitive' } }),
      ...(filter.barcode && { barcode: filter.barcode }),
    };

    if (filter.search) {
      where['OR'] = [
        { code: { contains: filter.search, mode: 'insensitive' } },
        { name: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const sortField = BIN_SORT_FIELDS[filter.sortBy ?? 'createdAt'] ?? 'createdAt';
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

  async hasActiveInventory(id: string): Promise<boolean> {
    const stockModel = (this.prisma as unknown as Record<string, unknown>)[
      'inventoryStock'
    ] as Record<string, unknown>;
    const count = await (stockModel['count'] as (a: unknown) => Promise<number>)({
      where: {
        binId: id,
        quantity: { gt: 0 },
      },
    });
    return count > 0;
  }

  async hasReservations(id: string): Promise<boolean> {
    const reservationModel = (this.prisma as unknown as Record<string, unknown>)[
      'inventoryReservation'
    ] as Record<string, unknown>;
    const count = await (
      reservationModel['count'] as (a: unknown) => Promise<number>
    )({
      where: {
        binId: id,
        status: { in: ['PENDING', 'CONFIRMED', 'PARTIALLY_FULFILLED'] },
      },
    });
    return count > 0;
  }

  async hasPendingOperations(id: string): Promise<boolean> {
    // Check for pending transfers involving this bin
    const transferModel = (this.prisma as unknown as Record<string, unknown>)[
      'inventoryTransfer'
    ] as Record<string, unknown>;
    const count = await (transferModel['count'] as (a: unknown) => Promise<number>)({
      where: {
        OR: [
          { 
            lines: {
              some: {
                OR: [
                  { fromBinId: id },
                  { toBinId: id },
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

  async findHistory(binId: string, workspaceId: string): Promise<Record<string, unknown>[]> {
    return this.callHistory<Record<string, unknown>[]>('findMany', {
      where: { binId, workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
