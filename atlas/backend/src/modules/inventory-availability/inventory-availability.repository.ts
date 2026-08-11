import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';

@Injectable()
export class InventoryAvailabilityRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get stockModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'inventoryStock'
    ] as Record<string, unknown>;
  }

  private get reservationModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'inventoryReservation'
    ] as Record<string, unknown>;
  }

  private get allocationModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'inventoryAllocation'
    ] as Record<string, unknown>;
  }

  private get itemModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'inventoryItem'
    ] as Record<string, unknown>;
  }

  private callStock<T>(method: string, args: unknown): Promise<T> {
    return (this.stockModel[method] as (a: unknown) => Promise<T>)(args);
  }

  private callReservation<T>(method: string, args: unknown): Promise<T> {
    return (this.reservationModel[method] as (a: unknown) => Promise<T>)(args);
  }

  private callAllocation<T>(method: string, args: unknown): Promise<T> {
    return (this.allocationModel[method] as (a: unknown) => Promise<T>)(args);
  }

  private callItem<T>(method: string, args: unknown): Promise<T> {
    return (this.itemModel[method] as (a: unknown) => Promise<T>)(args);
  }

  async getStockByItem(
    inventoryItemId: string,
    workspaceId: string,
    warehouseId?: string,
    locationId?: string,
    binId?: string,
    batchId?: string,
  ): Promise<Record<string, unknown>[]> {
    const where: Record<string, unknown> = {
      inventoryItemId,
      workspaceId,
    };

    if (warehouseId) where['warehouseId'] = warehouseId;
    if (locationId) where['locationId'] = locationId;
    if (binId) where['binId'] = binId;
    if (batchId) where['batchId'] = batchId;

    return this.callStock<Record<string, unknown>[]>('findMany', { where });
  }

  async getStockBySku(
    sku: string,
    workspaceId: string,
    warehouseId?: string,
  ): Promise<Record<string, unknown>[]> {
    const item = await this.callItem<Record<string, unknown> | null>('findFirst', {
      where: { sku, workspaceId, deletedAt: null },
    });

    if (!item) return [];

    return this.getStockByItem(
      item['id'] as string,
      workspaceId,
      warehouseId,
    );
  }

  async getActiveReservations(
    inventoryItemId: string,
    workspaceId: string,
    warehouseId?: string,
  ): Promise<Record<string, unknown>[]> {
    const where: Record<string, unknown> = {
      inventoryItemId,
      workspaceId,
      status: { in: ['PENDING', 'CONFIRMED'] },
    };

    const reservations = await this.callReservation<Record<string, unknown>[]>(
      'findMany',
      {
        where,
        include: { lines: true },
      },
    );

    if (warehouseId) {
      return reservations.filter((r) => {
        const lines = r['lines'] as Array<Record<string, unknown>>;
        return lines.some((l) => l['warehouseId'] === warehouseId);
      });
    }

    return reservations;
  }

  async getActiveAllocations(
    inventoryItemId: string,
    workspaceId: string,
    warehouseId?: string,
  ): Promise<Record<string, unknown>[]> {
    const where: Record<string, unknown> = {
      inventoryItemId,
      workspaceId,
      status: { in: ['PENDING', 'ALLOCATED', 'PARTIALLY_ALLOCATED'] },
    };

    const allocations = await this.callAllocation<Record<string, unknown>[]>(
      'findMany',
      {
        where,
        include: { lines: true },
      },
    );

    if (warehouseId) {
      return allocations.filter((a) => {
        const lines = a['lines'] as Array<Record<string, unknown>>;
        return lines.some((l) => l['warehouseId'] === warehouseId);
      });
    }

    return allocations;
  }

  async getStockByWarehouse(
    inventoryItemId: string,
    workspaceId: string,
    warehouseIds: string[],
  ): Promise<Map<string, Record<string, unknown>[]>> {
    const stocks = await this.callStock<Record<string, unknown>[]>('findMany', {
      where: {
        inventoryItemId,
        workspaceId,
        warehouseId: { in: warehouseIds },
      },
    });

    const grouped = new Map<string, Record<string, unknown>[]>();
    for (const stock of stocks) {
      const warehouseId = stock['warehouseId'] as string;
      if (!grouped.has(warehouseId)) {
        grouped.set(warehouseId, []);
      }
      grouped.get(warehouseId)!.push(stock);
    }

    return grouped;
  }

  async getInventoryItem(
    inventoryItemId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.callItem<Record<string, unknown> | null>('findFirst', {
      where: { id: inventoryItemId, workspaceId, deletedAt: null },
    });
  }

  async getInventoryItemBySku(
    sku: string,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.callItem<Record<string, unknown> | null>('findFirst', {
      where: { sku, workspaceId, deletedAt: null },
    });
  }

  async getBulkStockByItems(
    inventoryItemIds: string[],
    workspaceId: string,
    warehouseId?: string,
  ): Promise<Map<string, Record<string, unknown>[]>> {
    const where: Record<string, unknown> = {
      inventoryItemId: { in: inventoryItemIds },
      workspaceId,
    };

    if (warehouseId) where['warehouseId'] = warehouseId;

    const stocks = await this.callStock<Record<string, unknown>[]>('findMany', {
      where,
    });

    const grouped = new Map<string, Record<string, unknown>[]>();
    for (const stock of stocks) {
      const itemId = stock['inventoryItemId'] as string;
      if (!grouped.has(itemId)) {
        grouped.set(itemId, []);
      }
      grouped.get(itemId)!.push(stock);
    }

    return grouped;
  }

  async getBulkReservationsByItems(
    inventoryItemIds: string[],
    workspaceId: string,
  ): Promise<Map<string, Record<string, unknown>[]>> {
    const reservations = await this.callReservation<Record<string, unknown>[]>(
      'findMany',
      {
        where: {
          inventoryItemId: { in: inventoryItemIds },
          workspaceId,
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
        include: { lines: true },
      },
    );

    const grouped = new Map<string, Record<string, unknown>[]>();
    for (const reservation of reservations) {
      const itemId = reservation['inventoryItemId'] as string;
      if (!grouped.has(itemId)) {
        grouped.set(itemId, []);
      }
      grouped.get(itemId)!.push(reservation);
    }

    return grouped;
  }

  async getBulkAllocationsByItems(
    inventoryItemIds: string[],
    workspaceId: string,
  ): Promise<Map<string, Record<string, unknown>[]>> {
    const allocations = await this.callAllocation<Record<string, unknown>[]>(
      'findMany',
      {
        where: {
          inventoryItemId: { in: inventoryItemIds },
          workspaceId,
          status: { in: ['PENDING', 'ALLOCATED', 'PARTIALLY_ALLOCATED'] },
        },
        include: { lines: true },
      },
    );

    const grouped = new Map<string, Record<string, unknown>[]>();
    for (const allocation of allocations) {
      const itemId = allocation['inventoryItemId'] as string;
      if (!grouped.has(itemId)) {
        grouped.set(itemId, []);
      }
      grouped.get(itemId)!.push(allocation);
    }

    return grouped;
  }
}
