import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { PublicationMarketplace, PublicationStatus, SyncStatus } from './interfaces';
import type { PublicationFilterDto } from './dto';
import { LISTING_PUBLISHER_SORT_FIELDS } from './constants';

@Injectable()
export class ListingPublisherRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get model() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'listingPublication'
    ] as Record<string, unknown>;
  }

  private get historyModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'listingPublicationHistory'
    ] as Record<string, unknown>;
  }

  private get catalogProductModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'catalogProduct'
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

  async findByListingAndMarketplace(
    listingId: string,
    marketplace: PublicationMarketplace,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { listingId, marketplace, workspaceId, deletedAt: null },
      orderBy: { publicationVersion: 'desc' },
    });
  }

  async findByListingId(
    listingId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('findMany', {
      where: { listingId, workspaceId, deletedAt: null },
      orderBy: { publicationVersion: 'desc' },
    });
  }

  async findActiveByMarketplaceListingId(
    marketplaceListingId: string,
    marketplace: PublicationMarketplace,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: {
        marketplaceListingId,
        marketplace,
        workspaceId,
        deletedAt: null,
        status: { notIn: [PublicationStatus.ARCHIVED, PublicationStatus.UNPUBLISHED] },
      },
    });
  }

  async getNextVersion(
    listingId: string,
    marketplace: PublicationMarketplace,
    workspaceId: string,
  ): Promise<number> {
    const latest = await this.call<{ publicationVersion: number } | null>('findFirst', {
      where: { listingId, marketplace, workspaceId },
      orderBy: { publicationVersion: 'desc' },
      select: { publicationVersion: true },
    });
    return latest ? latest.publicationVersion + 1 : 1;
  }

  async findAll(
    workspaceId: string,
    filter: PublicationFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const statuses = filter.status
      ? Array.isArray(filter.status) ? filter.status : [filter.status]
      : undefined;

    const where: Record<string, unknown> = {
      workspaceId,
      deletedAt: null,
      ...(statuses && { status: { in: statuses } }),
      ...(filter.listingId && { listingId: filter.listingId }),
      ...(filter.catalogProductId && { catalogProductId: filter.catalogProductId }),
      ...(filter.marketplace && { marketplace: filter.marketplace }),
      ...(filter.syncStatus && { syncStatus: filter.syncStatus }),
    };

    if (filter.search) {
      where['OR'] = [
        { listingId: { contains: filter.search, mode: 'insensitive' } },
        { marketplaceListingId: { contains: filter.search, mode: 'insensitive' } },
        { catalogProductId: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const sortField = LISTING_PUBLISHER_SORT_FIELDS[filter.sortBy ?? 'createdAt'] ?? 'createdAt';
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
      status: PublicationStatus;
      marketplace: PublicationMarketplace;
      syncStatus: SyncStatus;
    }[]>('findMany', {
      where: { workspaceId, deletedAt: null },
      select: { status: true, marketplace: true, syncStatus: true },
    });

    const byStatus: Record<string, number> = {};
    const byMarketplace: Record<string, number> = {};
    const bySyncStatus: Record<string, number> = {};

    for (const item of all) {
      byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
      byMarketplace[item.marketplace] = (byMarketplace[item.marketplace] ?? 0) + 1;
      bySyncStatus[item.syncStatus] = (bySyncStatus[item.syncStatus] ?? 0) + 1;
    }

    return {
      total: all.length,
      byStatus,
      byMarketplace,
      bySyncStatus,
      publishedCount: byStatus[PublicationStatus.PUBLISHED] ?? 0,
      failedCount: byStatus[PublicationStatus.FAILED] ?? 0,
      pendingCount: byStatus[PublicationStatus.PENDING] ?? 0,
    };
  }

  /**
   * Real SKU source for Amazon publishing — Listing.content has no sku
   * field, CatalogProduct.catalogSku is the genuine origin.
   */
  async findCatalogProductSku(
    catalogProductId: string,
    workspaceId: string,
  ): Promise<string | null> {
    const product = await (this.catalogProductModel['findFirst'] as (
      a: unknown,
    ) => Promise<{ catalogSku: string } | null>)({
      where: { id: catalogProductId, workspaceId },
      select: { catalogSku: true },
    });
    return product?.catalogSku ?? null;
  }

  async findHistory(
    publicationId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.callHistory<Record<string, unknown>[]>('findMany', {
      where: { publicationId, workspaceId },
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
