import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { CatalogStatus, ProductType } from './interfaces';
import type { CatalogFilterDto } from './dto';
import { CATALOG_SORT_FIELDS } from './constants';

@Injectable()
export class ProductCatalogRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get model() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'catalogProduct'
    ] as Record<string, unknown>;
  }

  private get historyModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'catalogHistory'
    ] as Record<string, unknown>;
  }

  private call<T>(method: string, args: unknown): Promise<T> {
    return (this.model[method] as (a: unknown) => Promise<T>)(args);
  }

  private callHistory<T>(method: string, args: unknown): Promise<T> {
    return (this.historyModel[method] as (a: unknown) => Promise<T>)(args);
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

  async findBySku(catalogSku: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { catalogSku, workspaceId, deletedAt: null },
    });
  }

  async findByProcurementId(procurementId: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { procurementId, workspaceId, deletedAt: null },
    });
  }

  async findByQualityInspectionId(qualityInspectionId: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { qualityInspectionId, workspaceId, deletedAt: null },
    });
  }

  /** Duplicate detection: look for records with same productName + brand + supplierId */
  async findPotentialDuplicate(
    workspaceId: string,
    productName: string,
    brand: string | null | undefined,
    supplierId: string | null | undefined,
    excludeId?: string,
  ): Promise<Record<string, unknown> | null> {
    const where: Record<string, unknown> = {
      workspaceId,
      deletedAt: null,
      productName: { equals: productName, mode: 'insensitive' },
      ...(excludeId && { id: { not: excludeId } }),
    };

    if (brand) where['brand'] = { equals: brand, mode: 'insensitive' };
    if (supplierId) where['supplierId'] = supplierId;

    return this.call<Record<string, unknown> | null>('findFirst', { where });
  }

  async findAll(
    workspaceId: string,
    filter: CatalogFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const statuses = filter.status
      ? Array.isArray(filter.status)
        ? filter.status
        : [filter.status]
      : undefined;

    const where: Record<string, unknown> = {
      workspaceId,
      deletedAt: null,
      ...(statuses && { status: { in: statuses } }),
      ...(filter.productType && { productType: filter.productType }),
      ...(filter.categoryId && { categoryId: filter.categoryId }),
      ...(filter.brand && { brand: { contains: filter.brand, mode: 'insensitive' } }),
      ...(filter.supplierId && { supplierId: filter.supplierId }),
      ...(filter.procurementId && { procurementId: filter.procurementId }),
      ...(filter.qualityInspectionId && { qualityInspectionId: filter.qualityInspectionId }),
      ...(filter.countryOfOrigin && { countryOfOrigin: { contains: filter.countryOfOrigin, mode: 'insensitive' } }),
      ...(filter.hsCode && { hsCode: { contains: filter.hsCode, mode: 'insensitive' } }),
      ...(filter.isDuplicate !== undefined && { isDuplicate: filter.isDuplicate }),
    };

    if (filter.search) {
      where['OR'] = [
        { productName: { contains: filter.search, mode: 'insensitive' } },
        { catalogSku: { contains: filter.search, mode: 'insensitive' } },
        { brand: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
        { hsCode: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const sortField = CATALOG_SORT_FIELDS[filter.sortBy ?? 'createdAt'] ?? 'createdAt';
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

  async getStats(workspaceId: string): Promise<Record<string, unknown>> {
    const all = await this.call<{
      status: CatalogStatus;
      productType: ProductType;
      isDuplicate: boolean;
    }[]>('findMany', {
      where: { workspaceId, deletedAt: null },
      select: { status: true, productType: true, isDuplicate: true },
    });

    const byStatus: Record<string, number> = {};
    const byProductType: Record<string, number> = {};
    let duplicates = 0;

    for (const item of all) {
      byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
      byProductType[item.productType] = (byProductType[item.productType] ?? 0) + 1;
      if (item.isDuplicate) duplicates++;
    }

    return { total: all.length, byStatus, byProductType, duplicates };
  }

  async findHistory(catalogId: string, workspaceId: string): Promise<Record<string, unknown>[]> {
    return this.callHistory<Record<string, unknown>[]>('findMany', {
      where: { catalogId, workspaceId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── Update ───────────────────────────────────────────────────

  async update(
    id: string,
    workspaceId: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
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
}
