import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import type { InventoryStockFilterDto, InventoryTransactionFilterDto } from '../dto';
import { InventoryOwnershipType, InventoryStockStatus } from '../interfaces';
import { INVENTORY_STOCK_SORT_FIELDS, INVENTORY_TRANSACTION_SORT_FIELDS } from '../constants';

export interface StockBucketKey {
  inventoryItemId: string;
  warehouseId: string;
  locationId?: string | null;
  batchId?: string | null;
  status: InventoryStockStatus;
  ownershipType: InventoryOwnershipType;
  ownerRef?: string | null;
}

@Injectable()
export class InventoryStockRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get model() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'inventoryStock'
    ] as Record<string, unknown>;
  }

  private get transactionModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'inventoryTransaction'
    ] as Record<string, unknown>;
  }

  private call<T>(method: string, args: unknown): Promise<T> {
    return (this.model[method] as (a: unknown) => Promise<T>)(args);
  }

  private callTransaction<T>(method: string, args: unknown): Promise<T> {
    return (this.transactionModel[method] as (a: unknown) => Promise<T>)(args);
  }

  private bucketWhere(key: StockBucketKey): Record<string, unknown> {
    return {
      inventoryItemId: key.inventoryItemId,
      warehouseId: key.warehouseId,
      locationId: key.locationId ?? null,
      batchId: key.batchId ?? null,
      status: key.status,
      ownershipType: key.ownershipType,
      ownerRef: key.ownerRef ?? null,
    };
  }

  async findBucket(key: StockBucketKey, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { ...this.bucketWhere(key), workspaceId },
    });
  }

  async findById(id: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { id, workspaceId },
    });
  }

  /** Increments (or creates) the quantity for a stock bucket. Pass a negative delta to decrement. */
  async adjustBucketQuantity(
    key: StockBucketKey,
    workspaceId: string,
    delta: number,
    uom: string,
  ): Promise<Record<string, unknown>> {
    const existing = await this.findBucket(key, workspaceId);

    if (!existing) {
      return this.call<Record<string, unknown>>('create', {
        data: {
          workspaceId,
          inventoryItemId: key.inventoryItemId,
          warehouseId: key.warehouseId,
          locationId: key.locationId ?? null,
          batchId: key.batchId ?? null,
          status: key.status,
          ownershipType: key.ownershipType,
          ownerRef: key.ownerRef ?? null,
          quantity: delta,
          uom,
        },
      });
    }

    return this.call<Record<string, unknown>>('update', {
      where: { id: existing['id'] as string },
      data: { quantity: { increment: delta }, updatedAt: new Date() },
    });
  }

  /**
   * Atomically moves `quantity` from one bucket to another (e.g. AVAILABLE -> RESERVED
   * and back). The decrement uses a conditional `updateMany` guarded on the current
   * quantity so concurrent callers can never drive the source bucket below zero
   * (unless `allowNegative` is set) — this is what prevents over-reservation under
   * concurrent requests, since the whole read-check-write happens inside one
   * database transaction instead of two separate round trips.
   */
  async moveBucketQuantityAtomic(
    fromKey: StockBucketKey,
    toKey: StockBucketKey,
    workspaceId: string,
    quantity: number,
    uom: string,
    allowNegative: boolean,
  ): Promise<{
    success: boolean;
    from: Record<string, unknown> | null;
    to: Record<string, unknown> | null;
    quantityBefore: number;
  }> {
    return this.prisma.$transaction(async (tx) => {
      const model = (tx as unknown as Record<string, unknown>)[
        'inventoryStock'
      ] as Record<string, unknown>;
      const call = <T>(method: string, args: unknown): Promise<T> =>
        (model[method] as (a: unknown) => Promise<T>)(args);

      const fromBucket = await call<Record<string, unknown> | null>('findFirst', {
        where: { ...this.bucketWhere(fromKey), workspaceId },
      });
      const quantityBefore = (fromBucket?.['quantity'] as number) ?? 0;

      if (!fromBucket) {
        if (!allowNegative) {
          return { success: false, from: null, to: null, quantityBefore: 0 };
        }
        await call('create', {
          data: {
            workspaceId,
            inventoryItemId: fromKey.inventoryItemId,
            warehouseId: fromKey.warehouseId,
            locationId: fromKey.locationId ?? null,
            batchId: fromKey.batchId ?? null,
            status: fromKey.status,
            ownershipType: fromKey.ownershipType,
            ownerRef: fromKey.ownerRef ?? null,
            quantity: -quantity,
            uom,
          },
        });
      } else if (allowNegative) {
        await call('update', {
          where: { id: fromBucket['id'] },
          data: { quantity: { decrement: quantity }, updatedAt: new Date() },
        });
      } else {
        const decremented = await call<{ count: number }>('updateMany', {
          where: { id: fromBucket['id'], quantity: { gte: quantity } },
          data: { quantity: { decrement: quantity }, updatedAt: new Date() },
        });
        if (decremented.count !== 1) {
          return { success: false, from: null, to: null, quantityBefore };
        }
      }

      const toBucket = await call<Record<string, unknown> | null>('findFirst', {
        where: { ...this.bucketWhere(toKey), workspaceId },
      });

      const to = toBucket
        ? await call<Record<string, unknown>>('update', {
            where: { id: toBucket['id'] },
            data: { quantity: { increment: quantity }, updatedAt: new Date() },
          })
        : await call<Record<string, unknown>>('create', {
            data: {
              workspaceId,
              inventoryItemId: toKey.inventoryItemId,
              warehouseId: toKey.warehouseId,
              locationId: toKey.locationId ?? null,
              batchId: toKey.batchId ?? null,
              status: toKey.status,
              ownershipType: toKey.ownershipType,
              ownerRef: toKey.ownerRef ?? null,
              quantity,
              uom,
            },
          });

      const from = await call<Record<string, unknown>>('findFirst', {
        where: { ...this.bucketWhere(fromKey), workspaceId },
      });

      return { success: true, from, to, quantityBefore };
    });
  }

  /**
   * Atomically applies a signed delta to a single bucket. Negative deltas use a
   * conditional `updateMany` guarded on the current quantity (unless `allowNegative`
   * is set), so concurrent adjustments can never drive the bucket below zero.
   */
  async adjustBucketQuantityAtomic(
    key: StockBucketKey,
    workspaceId: string,
    delta: number,
    uom: string,
    allowNegative: boolean,
  ): Promise<{ success: boolean; bucket: Record<string, unknown> | null; quantityBefore: number }> {
    return this.prisma.$transaction(async (tx) => {
      const model = (tx as unknown as Record<string, unknown>)[
        'inventoryStock'
      ] as Record<string, unknown>;
      const call = <T>(method: string, args: unknown): Promise<T> =>
        (model[method] as (a: unknown) => Promise<T>)(args);

      const existing = await call<Record<string, unknown> | null>('findFirst', {
        where: { ...this.bucketWhere(key), workspaceId },
      });
      const quantityBefore = (existing?.['quantity'] as number) ?? 0;

      if (!existing) {
        if (delta < 0 && !allowNegative) {
          return { success: false, bucket: null, quantityBefore: 0 };
        }
        const created = await call<Record<string, unknown>>('create', {
          data: {
            workspaceId,
            inventoryItemId: key.inventoryItemId,
            warehouseId: key.warehouseId,
            locationId: key.locationId ?? null,
            batchId: key.batchId ?? null,
            status: key.status,
            ownershipType: key.ownershipType,
            ownerRef: key.ownerRef ?? null,
            quantity: delta,
            uom,
          },
        });
        return { success: true, bucket: created, quantityBefore: 0 };
      }

      if (delta >= 0 || allowNegative) {
        const updated = await call<Record<string, unknown>>('update', {
          where: { id: existing['id'] },
          data: { quantity: { increment: delta }, updatedAt: new Date() },
        });
        return { success: true, bucket: updated, quantityBefore };
      }

      const decremented = await call<{ count: number }>('updateMany', {
        where: { id: existing['id'], quantity: { gte: -delta } },
        data: { quantity: { increment: delta }, updatedAt: new Date() },
      });
      if (decremented.count !== 1) {
        return { success: false, bucket: null, quantityBefore };
      }

      const bucket = await call<Record<string, unknown>>('findFirst', {
        where: { id: existing['id'] },
      });
      return { success: true, bucket, quantityBefore };
    });
  }

  async findAll(
    inventoryItemId: string,
    workspaceId: string,
    filter: InventoryStockFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      inventoryItemId,
      workspaceId,
      ...(filter.warehouseId && { warehouseId: filter.warehouseId }),
      ...(filter.locationId && { locationId: filter.locationId }),
      ...(filter.status && { status: filter.status }),
      ...(filter.ownershipType && { ownershipType: filter.ownershipType }),
    };

    const sortField = INVENTORY_STOCK_SORT_FIELDS[filter.sortBy ?? 'updatedAt'] ?? 'updatedAt';
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

  async getOnHandSummary(
    inventoryItemId: string,
    workspaceId: string,
  ): Promise<{ status: InventoryStockStatus; quantity: number }[]> {
    const grouped = await this.call<
      { status: InventoryStockStatus; _sum: { quantity: number | null } }[]
    >('groupBy', {
      by: ['status'],
      where: { inventoryItemId, workspaceId },
      _sum: { quantity: true },
    });

    return grouped.map((g) => ({ status: g.status, quantity: g._sum.quantity ?? 0 }));
  }

  // ── Transactions (immutable ledger) ───────────────────────────

  /** Ledger writes are append-only: no update/delete is exposed for transaction facts. */
  async createTransaction(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.callTransaction<Record<string, unknown>>('create', { data });
  }

  async findTransactionById(
    id: string,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.callTransaction<Record<string, unknown> | null>('findFirst', {
      where: { id, workspaceId },
    });
  }

  async findTransactionByIdempotencyKey(
    workspaceId: string,
    idempotencyKey: string,
  ): Promise<Record<string, unknown> | null> {
    return this.callTransaction<Record<string, unknown> | null>('findFirst', {
      where: { workspaceId, idempotencyKey },
    });
  }

  /** Marks a posted transaction as reversed. Only the lifecycle pointer changes — the
   *  original quantity/type/reference facts are never mutated (see reversal transactions). */
  async markTransactionReversed(id: string): Promise<Record<string, unknown>> {
    return this.callTransaction<Record<string, unknown>>('update', {
      where: { id },
      data: { status: 'REVERSED', reversedAt: new Date() },
    });
  }

  async findTransactions(
    inventoryItemId: string,
    workspaceId: string,
    filter: InventoryTransactionFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      inventoryItemId,
      workspaceId,
      ...(filter.type && { type: filter.type }),
      ...(filter.status && { status: filter.status }),
      ...(filter.warehouseId && { warehouseId: filter.warehouseId }),
      ...(filter.locationId && { locationId: filter.locationId }),
      ...(filter.batchId && { batchId: filter.batchId }),
      ...(filter.serialId && { serialId: filter.serialId }),
      ...(filter.referenceType && { referenceType: filter.referenceType }),
      ...(filter.referenceId && { referenceId: filter.referenceId }),
      ...(filter.idempotencyKey && { idempotencyKey: filter.idempotencyKey }),
    };

    if (filter.fromDate || filter.toDate) {
      where['createdAt'] = {
        ...(filter.fromDate && { gte: new Date(filter.fromDate) }),
        ...(filter.toDate && { lte: new Date(filter.toDate) }),
      };
    }

    if (filter.search) {
      where['OR'] = [
        { sku: { contains: filter.search, mode: 'insensitive' } },
        { reason: { contains: filter.search, mode: 'insensitive' } },
        { referenceId: { contains: filter.search, mode: 'insensitive' } },
        { externalReference: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const sortField = INVENTORY_TRANSACTION_SORT_FIELDS[filter.sortBy ?? 'createdAt'] ?? 'createdAt';
    const orderBy = { [sortField]: filter.sortOrder ?? 'desc' };

    const [items, total] = await Promise.all([
      this.callTransaction<Record<string, unknown>[]>('findMany', {
        where,
        orderBy,
        skip: filter.skip,
        take: filter.limit,
      }),
      this.callTransaction<number>('count', { where }),
    ]);

    return [items, total];
  }
}
