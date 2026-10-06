import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';

@Injectable()
export class InventoryAnalyticsRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get snapshotModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'inventoryAnalyticsSnapshot'
    ] as Record<string, unknown>;
  }

  private get cacheModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'inventoryDashboardCache'
    ] as Record<string, unknown>;
  }

  private get stockModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'inventoryStock'
    ] as Record<string, unknown>;
  }

  private get transactionModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'inventoryTransaction'
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

  private callSnapshot<T>(method: string, args: unknown): Promise<T> {
    return (this.snapshotModel[method] as (a: unknown) => Promise<T>)(args);
  }

  private callCache<T>(method: string, args: unknown): Promise<T> {
    return (this.cacheModel[method] as (a: unknown) => Promise<T>)(args);
  }

  private callStock<T>(method: string, args: unknown): Promise<T> {
    return (this.stockModel[method] as (a: unknown) => Promise<T>)(args);
  }

  private callTransaction<T>(method: string, args: unknown): Promise<T> {
    return (this.transactionModel[method] as (a: unknown) => Promise<T>)(args);
  }

  private callReservation<T>(method: string, args: unknown): Promise<T> {
    return (this.reservationModel[method] as (a: unknown) => Promise<T>)(args);
  }

  private callAllocation<T>(method: string, args: unknown): Promise<T> {
    return (this.allocationModel[method] as (a: unknown) => Promise<T>)(args);
  }

  async getInventoryKPIs(
    workspaceId: string,
    warehouseId?: string,
  ): Promise<{
    physicalStock: number;
    availableStock: number;
    reservedStock: number;
    allocatedStock: number;
    blockedStock: number;
    damagedStock: number;
  }> {
    const where: Record<string, unknown> = { workspaceId };
    if (warehouseId) where['warehouseId'] = warehouseId;

    const aggregates = (await this.callStock('aggregate', {
      where,
      _sum: { quantity: true },
    })) as { _sum: { quantity: number | null } };

    const reservedAgg = (await this.callReservation('aggregate', {
      where: { workspaceId, ...(warehouseId && { warehouseId }) },
      _sum: { quantity: true },
    })) as { _sum: { quantity: number | null } };

    const allocatedAgg = (await this.callAllocation('aggregate', {
      where: { workspaceId, ...(warehouseId && { warehouseId }) },
      _sum: { quantity: true },
    })) as { _sum: { quantity: number | null } };

    return {
      physicalStock: aggregates._sum?.quantity || 0,
      availableStock: aggregates._sum?.quantity || 0,
      reservedStock: reservedAgg._sum?.quantity || 0,
      allocatedStock: allocatedAgg._sum?.quantity || 0,
      blockedStock: 0,
      damagedStock: 0,
    };
  }

  async getStockLevelCounts(
    workspaceId: string,
    warehouseId?: string,
  ): Promise<{
    lowStockCount: number;
    outOfStockCount: number;
    excessStockCount: number;
  }> {
    const where: Record<string, unknown> = { workspaceId };
    if (warehouseId) where['warehouseId'] = warehouseId;

    const outOfStock = await this.callStock<number>('count', {
      where: { ...where, quantity: { lte: 0 } },
    });

    return {
      lowStockCount: 0,
      outOfStockCount: outOfStock,
      excessStockCount: 0,
    };
  }

  async getMovementMetrics(
    workspaceId: string,
    warehouseId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    receivedQuantity: number;
    dispatchedQuantity: number;
    adjustmentQuantity: number;
  }> {
    const where: Record<string, unknown> = { workspaceId };
    if (warehouseId) where['warehouseId'] = warehouseId;
    
    if (startDate || endDate) {
      where['createdAt'] = {};
      if (startDate) (where['createdAt'] as Record<string, unknown>)['gte'] = startDate;
      if (endDate) (where['createdAt'] as Record<string, unknown>)['lte'] = endDate;
    }

    const received = (await this.callTransaction('aggregate', {
      where: { ...where, type: 'RECEIPT' },
      _sum: { quantity: true },
    })) as { _sum: { quantity: number | null } };

    const dispatched = (await this.callTransaction('aggregate', {
      where: { ...where, type: 'ISSUE' },
      _sum: { quantity: true },
    })) as { _sum: { quantity: number | null } };

    const adjustment = (await this.callTransaction('aggregate', {
      where: { ...where, type: 'ADJUSTMENT' },
      _sum: { quantity: true },
    })) as { _sum: { quantity: number | null } };

    return {
      receivedQuantity: received._sum?.quantity || 0,
      dispatchedQuantity: Math.abs(dispatched._sum?.quantity || 0),
      adjustmentQuantity: adjustment._sum?.quantity || 0,
    };
  }

  async getWarehouseBreakdown(
    workspaceId: string,
  ): Promise<
    Array<{
      warehouseId: string;
      physicalStock: number;
      skuCount: number;
    }>
  > {
    const groupedData = (await this.callStock('groupBy', {
      by: ['warehouseId'],
      where: { workspaceId },
      _sum: { quantity: true },
      _count: { inventoryItemId: true },
    })) as Array<{
      warehouseId: string;
      _sum: { quantity: number | null };
      _count: { inventoryItemId: number };
    }>;

    return groupedData.map((item) => ({
      warehouseId: item.warehouseId,
      physicalStock: item._sum?.quantity || 0,
      skuCount: item._count?.inventoryItemId || 0,
    }));
  }

  async getProductAnalytics(
    workspaceId: string,
    warehouseId?: string,
    limit?: number,
    offset?: number,
  ): Promise<
    [
      Array<{
        inventoryItemId: string;
        physicalStock: number;
        availableStock: number;
      }>,
      number,
    ]
  > {
    const where: Record<string, unknown> = { workspaceId };
    if (warehouseId) where['warehouseId'] = warehouseId;

    const [data, total] = await Promise.all([
      this.callStock<
        Array<{
          inventoryItemId: string;
          quantity: number;
        }>
      >('findMany', {
        where,
        select: {
          inventoryItemId: true,
          quantity: true,
        },
        take: limit,
        skip: offset,
      }),
      this.callStock<number>('count', { where }),
    ]);

    const result = data.map((item) => ({
      inventoryItemId: item.inventoryItemId,
      physicalStock: item.quantity,
      availableStock: item.quantity,
    }));

    return [result, total];
  }

  async getCachedDashboard(
    workspaceId: string,
    cacheKey: string,
  ): Promise<Record<string, unknown> | null> {
    const cached = await this.callCache<Record<string, unknown> | null>(
      'findFirst',
      {
        where: {
          workspaceId,
          cacheKey,
          expiresAt: { gte: new Date() },
        },
      },
    );

    return cached ? (cached['cacheData'] as Record<string, unknown>) : null;
  }

  async setCachedDashboard(
    workspaceId: string,
    warehouseId: string | null,
    cacheKey: string,
    data: Record<string, unknown>,
    ttlMinutes: number,
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);

    await this.callCache('upsert', {
      where: {
        workspaceId_cacheKey: {
          workspaceId,
          cacheKey,
        },
      },
      create: {
        workspaceId,
        warehouseId,
        cacheKey,
        cacheData: data,
        expiresAt,
      },
      update: {
        cacheData: data,
        expiresAt,
      },
    });
  }

  async invalidateCache(workspaceId: string, pattern?: string): Promise<number> {
    const where: Record<string, unknown> = { workspaceId };
    if (pattern) {
      where['cacheKey'] = { contains: pattern };
    }

    const result = (await this.callCache('deleteMany', { where })) as {
      count: number;
    };
    return result.count;
  }
}
