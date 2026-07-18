import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { ListingMarketplace, ListingStatus, MarketplaceListingStatus } from './interfaces';
import type { ListingFilterDto, UniversalListingFilterDto, MarketplaceListingFilterDto } from './dto';
import { LISTING_SORT_FIELDS } from './constants';

@Injectable()
export class ListingRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get model() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'listing'
    ] as Record<string, unknown>;
  }

  private get historyModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'listingHistory'
    ] as Record<string, unknown>;
  }

  private call<T>(method: string, args: unknown): Promise<T> {
    return (this.model[method] as (a: unknown) => Promise<T>)(args);
  }

  private callHistory<T>(method: string, args: unknown): Promise<T> {
    return (this.historyModel[method] as (a: unknown) => Promise<T>)(args);
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

  async findByCatalogProductId(
    catalogProductId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('findMany', {
      where: { catalogProductId, workspaceId, deletedAt: null },
      orderBy: { version: 'desc' },
    });
  }

  async findLatestByCatalogProductId(
    catalogProductId: string,
    workspaceId: string,
    marketplace?: ListingMarketplace,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: {
        catalogProductId,
        workspaceId,
        deletedAt: null,
        ...(marketplace && { marketplace }),
      },
      orderBy: { version: 'desc' },
    });
  }

  async getNextVersion(
    catalogProductId: string,
    workspaceId: string,
    marketplace: ListingMarketplace,
  ): Promise<number> {
    const latest = await this.call<{ version: number } | null>('findFirst', {
      where: { catalogProductId, workspaceId, marketplace },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    return latest ? latest.version + 1 : 1;
  }

  async findAll(
    workspaceId: string,
    filter: ListingFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const statuses = filter.status
      ? Array.isArray(filter.status) ? filter.status : [filter.status]
      : undefined;

    const where: Record<string, unknown> = {
      workspaceId,
      deletedAt: null,
      ...(statuses && { status: { in: statuses } }),
      ...(filter.catalogProductId && { catalogProductId: filter.catalogProductId }),
      ...(filter.marketplace && { marketplace: filter.marketplace }),
    };

    if (filter.search) {
      where['OR'] = [
        { catalogProductId: { contains: filter.search, mode: 'insensitive' } },
        { marketplace: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const sortField = LISTING_SORT_FIELDS[filter.sortBy ?? 'createdAt'] ?? 'createdAt';
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
      status: ListingStatus;
      marketplace: ListingMarketplace;
      qualityScore: number | null;
    }[]>('findMany', {
      where: { workspaceId, deletedAt: null },
      select: { status: true, marketplace: true, qualityScore: true },
    });

    const byStatus: Record<string, number> = {};
    const byMarketplace: Record<string, number> = {};

    for (const item of all) {
      byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
      byMarketplace[item.marketplace] = (byMarketplace[item.marketplace] ?? 0) + 1;
    }

    const scored = all.filter((i) => i.qualityScore !== null);
    const averageQualityScore = scored.length > 0
      ? Math.round(scored.reduce((s, i) => s + (i.qualityScore as number), 0) / scored.length)
      : 0;

    return { total: all.length, byStatus, byMarketplace, averageQualityScore };
  }

  async findHistory(listingId: string, workspaceId: string): Promise<Record<string, unknown>[]> {
    return this.callHistory<Record<string, unknown>[]>('findMany', {
      where: { listingId, workspaceId },
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

  // ═══════════════════════════════════════════════════════════════
  // UNIVERSAL LISTING
  // ═══════════════════════════════════════════════════════════════

  private get universalModel() {
    return (this.prisma as unknown as Record<string, unknown>)['universalListing'] as Record<string, unknown>;
  }

  private get universalHistoryModel() {
    return (this.prisma as unknown as Record<string, unknown>)['universalListingHistory'] as Record<string, unknown>;
  }

  private callUniversal<T>(method: string, args: unknown): Promise<T> {
    return (this.universalModel[method] as (a: unknown) => Promise<T>)(args);
  }

  private callUniversalHistory<T>(method: string, args: unknown): Promise<T> {
    return (this.universalHistoryModel[method] as (a: unknown) => Promise<T>)(args);
  }

  async createUniversalListing(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.callUniversal<Record<string, unknown>>('create', { data });
  }

  async findUniversalListingById(id: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.callUniversal<Record<string, unknown> | null>('findFirst', {
      where: { id, workspaceId, deletedAt: null },
    });
  }

  async findUniversalListingsByCatalogProduct(
    catalogProductId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.callUniversal<Record<string, unknown>[]>('findMany', {
      where: { catalogProductId, workspaceId, deletedAt: null },
      orderBy: { version: 'desc' },
    });
  }

  async getNextUniversalVersion(catalogProductId: string, workspaceId: string): Promise<number> {
    const latest = await this.callUniversal<{ version: number } | null>('findFirst', {
      where: { catalogProductId, workspaceId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    return latest ? latest.version + 1 : 1;
  }

  async findAllUniversalListings(
    workspaceId: string,
    filter: UniversalListingFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      workspaceId,
      deletedAt: null,
      ...(filter.catalogProductId && { catalogProductId: filter.catalogProductId }),
      ...(filter.status && { status: filter.status }),
    };

    const [items, total] = await Promise.all([
      this.callUniversal<Record<string, unknown>[]>('findMany', {
        where,
        orderBy: { updatedAt: 'desc' },
        skip: filter.skip,
        take: filter.limit,
      }),
      this.callUniversal<number>('count', { where }),
    ]);
    return [items, total];
  }

  async updateUniversalListing(
    id: string,
    workspaceId: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.callUniversal<Record<string, unknown>>('update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async softDeleteUniversalListing(id: string): Promise<void> {
    await this.callUniversal<unknown>('update', {
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async createUniversalListingHistory(data: Record<string, unknown>): Promise<void> {
    await this.callUniversalHistory<unknown>('create', { data });
  }

  async findUniversalListingHistory(
    universalListingId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.callUniversalHistory<Record<string, unknown>[]>('findMany', {
      where: { universalListingId, workspaceId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // MARKETPLACE LISTING
  // ═══════════════════════════════════════════════════════════════

  private get marketplaceListingModel() {
    return (this.prisma as unknown as Record<string, unknown>)['marketplaceListing'] as Record<string, unknown>;
  }

  private get marketplaceListingHistoryModel() {
    return (this.prisma as unknown as Record<string, unknown>)['marketplaceListingHistory'] as Record<string, unknown>;
  }

  private callMpListing<T>(method: string, args: unknown): Promise<T> {
    return (this.marketplaceListingModel[method] as (a: unknown) => Promise<T>)(args);
  }

  private callMpListingHistory<T>(method: string, args: unknown): Promise<T> {
    return (this.marketplaceListingHistoryModel[method] as (a: unknown) => Promise<T>)(args);
  }

  async createMarketplaceListing(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.callMpListing<Record<string, unknown>>('create', { data });
  }

  async findMarketplaceListingById(id: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.callMpListing<Record<string, unknown> | null>('findFirst', {
      where: { id, workspaceId, deletedAt: null },
    });
  }

  async findMarketplaceListingsByUniversalId(
    universalListingId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.callMpListing<Record<string, unknown>[]>('findMany', {
      where: { universalListingId, workspaceId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findAllMarketplaceListings(
    workspaceId: string,
    filter: MarketplaceListingFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      workspaceId,
      deletedAt: null,
      ...(filter.universalListingId && { universalListingId: filter.universalListingId }),
      ...(filter.marketplaceKey && { marketplaceKey: filter.marketplaceKey }),
      ...(filter.country && { country: filter.country }),
      ...(filter.status && { status: filter.status }),
    };

    const [items, total] = await Promise.all([
      this.callMpListing<Record<string, unknown>[]>('findMany', {
        where,
        orderBy: { updatedAt: 'desc' },
        skip: filter.skip,
        take: filter.limit,
      }),
      this.callMpListing<number>('count', { where }),
    ]);
    return [items, total];
  }

  async updateMarketplaceListing(
    id: string,
    workspaceId: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.callMpListing<Record<string, unknown>>('update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async softDeleteMarketplaceListing(id: string): Promise<void> {
    await this.callMpListing<unknown>('update', {
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async createMarketplaceListingHistory(
    marketplaceListingId: string,
    workspaceId: string,
    data: {
      fromStatus: MarketplaceListingStatus;
      toStatus: MarketplaceListingStatus;
      version: number;
      reason?: string | null;
      changedBy?: string | null;
      snapshotPayload?: Record<string, unknown> | null;
    },
  ): Promise<void> {
    await this.callMpListingHistory<unknown>('create', {
      data: {
        marketplaceListingId,
        workspaceId,
        fromStatus: data.fromStatus,
        toStatus: data.toStatus,
        version: data.version,
        reason: data.reason ?? null,
        changedBy: data.changedBy ?? null,
        snapshotPayload: data.snapshotPayload ?? null,
        createdAt: new Date(),
      },
    });
  }

  async findMarketplaceListingHistory(
    marketplaceListingId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.callMpListingHistory<Record<string, unknown>[]>('findMany', {
      where: { marketplaceListingId, workspaceId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
