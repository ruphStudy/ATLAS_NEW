import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { BrandEntityLinkFilterOptions, BrandFilterOptions } from '../interfaces';
import { MULTI_BRAND_CONSTANTS } from '../constants';

@Injectable()
export class MultiBrandRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Internal Helpers ──────────────────────────────────────

  private model(name: string) {
    return (this.prisma as unknown as Record<string, unknown>)[name] as Record<string, unknown>;
  }

  private call<T>(modelName: string, method: string, args: unknown): Promise<T> {
    const m = this.model(modelName);
    return (m[method] as (a: unknown) => Promise<T>)(args);
  }

  // ── Brand ───────────────────────────────────────────────────

  async createBrand(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('brand', 'create', { data });
  }

  async findBrandById(id: string, workspaceId?: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('brand', 'findFirst', {
      where: { id, deletedAt: null, ...(workspaceId ? { workspaceId } : {}) },
    });
  }

  async findBrandByCode(workspaceId: string, code: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('brand', 'findFirst', {
      where: { workspaceId, code, deletedAt: null },
    });
  }

  async findDefaultBrand(workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('brand', 'findFirst', {
      where: { workspaceId, isDefault: true, deletedAt: null },
    });
  }

  async clearDefaultBrand(workspaceId: string): Promise<void> {
    await this.call('brand', 'updateMany', {
      where: { workspaceId, isDefault: true, deletedAt: null },
      data: { isDefault: false },
    });
  }

  async updateBrand(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('brand', 'update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async findBrands(filter: BrandFilterOptions): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filter.workspaceId !== undefined) where['workspaceId'] = filter.workspaceId;
    if (filter.organizationId !== undefined) where['organizationId'] = filter.organizationId;
    if (filter.code) where['code'] = filter.code;
    if (filter.status) where['status'] = filter.status;
    if (filter.countryCode) where['countryCodes'] = { has: filter.countryCode.toUpperCase() };
    if (filter.search) {
      where['OR'] = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { code: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const sortField = MULTI_BRAND_CONSTANTS.SORT_FIELDS[filter.sortBy ?? 'priority'] ?? 'priority';
    const orderBy = { [sortField]: filter.sortOrder ?? 'desc' };
    const take = Math.min(filter.limit ?? MULTI_BRAND_CONSTANTS.DEFAULT_PAGE_SIZE, MULTI_BRAND_CONSTANTS.MAX_PAGE_SIZE);
    const skip = filter.page ? (filter.page - 1) * take : 0;

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('brand', 'findMany', { where, orderBy, take, skip }),
      this.call<number>('brand', 'count', { where }),
    ]);
    return [items, total];
  }

  async findActiveBrandsForWorkspace(workspaceId: string): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('brand', 'findMany', {
      where: { workspaceId, status: 'ACTIVE', deletedAt: null },
      orderBy: { priority: 'desc' },
    });
  }

  // ── Brand History ─────────────────────────────────────────

  async createBrandHistory(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('brandHistory', 'create', { data });
  }

  async findBrandHistory(brandId: string, limit = 20): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('brandHistory', 'findMany', {
      where: { brandId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findBrandHistoryByVersion(brandId: string, version: number): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('brandHistory', 'findFirst', {
      where: { brandId, version },
    });
  }

  // ── Brand Entity Links ────────────────────────────────────

  async createLink(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('brandEntityLink', 'create', { data });
  }

  async findLink(brandId: string, entityType: string, entityId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('brandEntityLink', 'findFirst', {
      where: { brandId, entityType, entityId },
    });
  }

  /** Every OTHER brand this entity is already linked to — used to detect exclusive (non-shared) cross-brand conflicts. */
  async findLinksForEntity(workspaceId: string, entityType: string, entityId: string, excludeBrandId?: string): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('brandEntityLink', 'findMany', {
      where: {
        workspaceId,
        entityType,
        entityId,
        ...(excludeBrandId ? { brandId: { not: excludeBrandId } } : {}),
      },
    });
  }

  async findLinks(filter: BrandEntityLinkFilterOptions): Promise<Record<string, unknown>[]> {
    const where: Record<string, unknown> = {};
    if (filter.brandId) where['brandId'] = filter.brandId;
    if (filter.workspaceId) where['workspaceId'] = filter.workspaceId;
    if (filter.entityType) where['entityType'] = filter.entityType;
    if (filter.entityId) where['entityId'] = filter.entityId;
    return this.call<Record<string, unknown>[]>('brandEntityLink', 'findMany', {
      where,
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteLink(id: string): Promise<void> {
    await this.call('brandEntityLink', 'delete', { where: { id } });
  }
}
