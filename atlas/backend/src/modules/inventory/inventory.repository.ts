import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import type { InventoryItemFilterDto } from './dto';
import { INVENTORY_ITEM_SORT_FIELDS } from './constants';

@Injectable()
export class InventoryRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get model() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'inventoryItem'
    ] as Record<string, unknown>;
  }

  private get historyModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'inventoryItemHistory'
    ] as Record<string, unknown>;
  }

  private get unitConversionModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'inventoryUnitConversion'
    ] as Record<string, unknown>;
  }

  private get configModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'inventoryConfig'
    ] as Record<string, unknown>;
  }

  private call<T>(method: string, args: unknown): Promise<T> {
    return (this.model[method] as (a: unknown) => Promise<T>)(args);
  }

  private callHistory<T>(method: string, args: unknown): Promise<T> {
    return (this.historyModel[method] as (a: unknown) => Promise<T>)(args);
  }

  private callUnitConversion<T>(method: string, args: unknown): Promise<T> {
    return (this.unitConversionModel[method] as (a: unknown) => Promise<T>)(args);
  }

  private callConfig<T>(method: string, args: unknown): Promise<T> {
    return (this.configModel[method] as (a: unknown) => Promise<T>)(args);
  }

  // ── Sequence ─────────────────────────────────────────────────

  async getNextSequence(workspaceId: string): Promise<number> {
    const last = await this.call<{ skuSequence: number } | null>('findFirst', {
      where: { workspaceId },
      orderBy: { skuSequence: 'desc' },
      select: { skuSequence: true },
    });
    return last ? last.skuSequence + 1 : 1;
  }

  // ── Create ───────────────────────────────────────────────────

  async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('create', { data });
  }

  async createHistoryEntry(data: Record<string, unknown>): Promise<void> {
    await this.callHistory<unknown>('create', { data });
  }

  // ── Read ─────────────────────────────────────────────────────

  async findById(id: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { id, workspaceId, deletedAt: null },
    });
  }

  async findBySku(sku: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { sku, workspaceId, deletedAt: null },
    });
  }

  async findByCatalogProductId(
    catalogProductId: string,
    workspaceId: string,
    variantId?: string | null,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: {
        catalogProductId,
        workspaceId,
        variantId: variantId ?? null,
        deletedAt: null,
      },
    });
  }

  async findAllByCatalogProductId(
    catalogProductId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('findMany', {
      where: { catalogProductId, workspaceId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findAll(
    workspaceId: string,
    filter: InventoryItemFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      workspaceId,
      deletedAt: null,
      ...(filter.status && { status: filter.status }),
      ...(filter.trackingType && { trackingType: filter.trackingType }),
      ...(filter.catalogProductId && { catalogProductId: filter.catalogProductId }),
      ...(filter.variantId && { variantId: filter.variantId }),
    };

    if (filter.search) {
      where['OR'] = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { sku: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const sortField = INVENTORY_ITEM_SORT_FIELDS[filter.sortBy ?? 'createdAt'] ?? 'createdAt';
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

  async findHistory(
    inventoryItemId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.callHistory<Record<string, unknown>[]>('findMany', {
      where: { inventoryItemId, workspaceId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── Update ───────────────────────────────────────────────────

  async update(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  // ── Delete ───────────────────────────────────────────────────

  async softDelete(id: string): Promise<void> {
    await this.call<unknown>('update', {
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ── Unit Conversions ─────────────────────────────────────────

  async createUnitConversion(
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.callUnitConversion<Record<string, unknown>>('create', { data });
  }

  async findUnitConversion(
    inventoryItemId: string,
    fromUom: string,
    toUom: string,
  ): Promise<Record<string, unknown> | null> {
    return this.callUnitConversion<Record<string, unknown> | null>('findFirst', {
      where: { inventoryItemId, fromUom, toUom },
    });
  }

  async findUnitConversions(inventoryItemId: string): Promise<Record<string, unknown>[]> {
    return this.callUnitConversion<Record<string, unknown>[]>('findMany', {
      where: { inventoryItemId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── Config ───────────────────────────────────────────────────

  async findConfig(inventoryItemId: string): Promise<Record<string, unknown> | null> {
    return this.callConfig<Record<string, unknown> | null>('findFirst', {
      where: { inventoryItemId },
    });
  }

  async upsertConfig(
    inventoryItemId: string,
    workspaceId: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.callConfig<Record<string, unknown>>('upsert', {
      where: { inventoryItemId },
      create: { inventoryItemId, workspaceId, ...data },
      update: { ...data, updatedAt: new Date() },
    });
  }
}
