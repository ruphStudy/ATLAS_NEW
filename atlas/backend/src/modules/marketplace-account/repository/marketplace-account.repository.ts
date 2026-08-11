import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { AccountFilterOptions } from '../interfaces';
import { MP_ACCOUNT_CONSTANTS } from '../constants';

@Injectable()
export class MarketplaceAccountRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private model(name: string) {
    return (this.prisma as unknown as Record<string, unknown>)[name] as Record<string, unknown>;
  }

  private call<T>(model: string, method: string, args: unknown): Promise<T> {
    const m = this.model(model);
    return (m[method] as (a: unknown) => Promise<T>)(args);
  }

  // ── Accounts ──────────────────────────────────────────────

  async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('marketplaceAccount', 'create', {
      data: { ...data, createdAt: new Date(), updatedAt: new Date() },
    });
  }

  async findById(id: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('marketplaceAccount', 'findFirst', {
      where: { id, workspaceId, deletedAt: null },
    });
  }

  async findByExternalAccountId(
    workspaceId: string,
    providerKey: string,
    externalAccountId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('marketplaceAccount', 'findFirst', {
      where: {
        workspaceId,
        providerKey: providerKey.toUpperCase(),
        externalAccountId,
        deletedAt: null,
      },
    });
  }

  async findDefault(
    workspaceId: string,
    marketplaceKey: string,
    country?: string | null,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('marketplaceAccount', 'findFirst', {
      where: {
        workspaceId,
        marketplaceKey: marketplaceKey.toUpperCase(),
        country: country ?? null,
        isDefault: true,
        deletedAt: null,
      },
    });
  }

  async findMany(filter: AccountFilterOptions): Promise<[Record<string, unknown>[], number]> {
    const where = this.buildWhere(filter);
    const take = Math.min(filter.limit ?? MP_ACCOUNT_CONSTANTS.DEFAULT_PAGE_SIZE, MP_ACCOUNT_CONSTANTS.MAX_PAGE_SIZE);
    const skip = filter.page ? (filter.page - 1) * take : 0;
    const sortField = MP_ACCOUNT_CONSTANTS.SORT_FIELDS.includes(filter.sortBy as never)
      ? filter.sortBy!
      : 'createdAt';
    const orderBy = { [sortField]: filter.sortOrder ?? 'desc' };

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('marketplaceAccount', 'findMany', {
        where,
        orderBy,
        take,
        skip,
      }),
      this.call<number>('marketplaceAccount', 'count', { where }),
    ]);
    return [items, total];
  }

  async update(
    id: string,
    workspaceId: string,
    data: Record<string, unknown>,
    expectedVersion?: number,
  ): Promise<Record<string, unknown>> {
    const where: Record<string, unknown> = { id, workspaceId, deletedAt: null };
    if (expectedVersion !== undefined) where['version'] = expectedVersion;
    return this.call<Record<string, unknown>>('marketplaceAccount', 'updateMany', {
      where,
      data: { ...data, version: { increment: 1 }, updatedAt: new Date() },
    }).then(async (result) => {
      const r = result as { count: number };
      if (r.count === 0) {
        throw new Error('Optimistic lock conflict or record not found');
      }
      return (await this.findById(id, workspaceId))!;
    });
  }

  async softDelete(id: string, workspaceId: string): Promise<void> {
    await this.call<void>('marketplaceAccount', 'updateMany', {
      where: { id, workspaceId, deletedAt: null },
      data: { deletedAt: new Date(), updatedAt: new Date() },
    });
  }

  async clearDefault(
    workspaceId: string,
    marketplaceKey: string,
    country?: string | null,
    excludeId?: string,
  ): Promise<void> {
    const where: Record<string, unknown> = {
      workspaceId,
      marketplaceKey: marketplaceKey.toUpperCase(),
      country: country ?? null,
      isDefault: true,
      deletedAt: null,
    };
    if (excludeId) where['id'] = { not: excludeId };
    await this.call<void>('marketplaceAccount', 'updateMany', {
      where,
      data: { isDefault: false, updatedAt: new Date() },
    });
  }

  // ── History ───────────────────────────────────────────────

  async createHistory(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('marketplaceAccountHistory', 'create', { data });
  }

  async findHistory(
    accountId: string,
    workspaceId: string,
    opts?: { page?: number; limit?: number },
  ): Promise<[Record<string, unknown>[], number]> {
    const take = Math.min(opts?.limit ?? 50, 200);
    const skip = opts?.page ? (opts.page - 1) * take : 0;
    const where = { accountId, workspaceId };

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('marketplaceAccountHistory', 'findMany', {
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.call<number>('marketplaceAccountHistory', 'count', { where }),
    ]);
    return [items, total];
  }

  // ── Helpers ───────────────────────────────────────────────

  private buildWhere(filter: AccountFilterOptions): Record<string, unknown> {
    const where: Record<string, unknown> = { workspaceId: filter.workspaceId, deletedAt: null };
    if (filter.providerKey) where['providerKey'] = filter.providerKey.toUpperCase();
    if (filter.marketplaceKey) where['marketplaceKey'] = filter.marketplaceKey.toUpperCase();
    if (filter.country) where['country'] = filter.country;
    if (filter.status) where['status'] = filter.status;
    if (filter.isDefault !== undefined && filter.isDefault !== null) where['isDefault'] = filter.isDefault;
    if (filter.search) {
      where['OR'] = [
        { accountName: { contains: filter.search, mode: 'insensitive' } },
        { externalAccountId: { contains: filter.search, mode: 'insensitive' } },
        { sellerId: { contains: filter.search, mode: 'insensitive' } },
      ];
    }
    return where;
  }
}
