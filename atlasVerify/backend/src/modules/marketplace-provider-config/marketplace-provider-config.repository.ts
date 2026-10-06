import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { ConfigurationStatus, ConfigurationFilterOptions } from './interfaces';
import { MP_CONFIG_CONSTANTS } from './constants';

@Injectable()
export class MarketplaceProviderConfigRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Accessors ─────────────────────────────────────────────

  private model(name: string) {
    return (this.prisma as unknown as Record<string, unknown>)[name] as Record<string, unknown>;
  }

  private call<T>(modelName: string, method: string, args: unknown): Promise<T> {
    const m = this.model(modelName);
    return (m[method] as (a: unknown) => Promise<T>)(args);
  }

  // ── Config CRUD ───────────────────────────────────────────

  async createConfig(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('marketplaceProviderConfigRecord', 'create', { data });
  }

  async findConfigById(id: string, workspaceId?: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('marketplaceProviderConfigRecord', 'findFirst', {
      where: {
        id,
        deletedAt: null,
        ...(workspaceId ? { OR: [{ workspaceId }, { workspaceId: null }] } : {}),
      },
    });
  }

  async findConfigs(
    filter: ConfigurationFilterOptions,
  ): Promise<[Record<string, unknown>[], number]> {
    const where = this.buildWhere(filter);
    const sortField = MP_CONFIG_CONSTANTS.SORT_FIELDS[filter.sortBy ?? 'createdAt'] ?? 'createdAt';
    const orderBy = { [sortField]: filter.sortOrder ?? 'desc' };
    const take = Math.min(filter.limit ?? MP_CONFIG_CONSTANTS.DEFAULT_PAGE_SIZE, MP_CONFIG_CONSTANTS.MAX_PAGE_SIZE);
    const skip = filter.page ? (filter.page - 1) * take : 0;

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('marketplaceProviderConfigRecord', 'findMany', {
        where, orderBy, take, skip,
      }),
      this.call<number>('marketplaceProviderConfigRecord', 'count', { where }),
    ]);

    return [items, total];
  }

  async findActiveConfig(
    providerKey: string,
    workspaceId?: string | null,
    accountId?: string | null,
    marketplaceKey?: string | null,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('marketplaceProviderConfigRecord', 'findFirst', {
      where: {
        providerKey: providerKey.toUpperCase(),
        status: ConfigurationStatus.PUBLISHED,
        deletedAt: null,
        OR: [
          { workspaceId },
          { workspaceId: null },
        ],
        ...(accountId ? { accountId } : {}),
      },
      orderBy: [
        { workspaceId: 'desc' }, // workspace-specific takes priority over global
        { payload: { priority: 'asc' } },
        { createdAt: 'desc' },
      ],
    });
  }

  async updateConfig(
    id: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('marketplaceProviderConfigRecord', 'update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async softDeleteConfig(id: string): Promise<void> {
    await this.call<unknown>('marketplaceProviderConfigRecord', 'updateMany', {
      where: { id, deletedAt: null },
      data: { deletedAt: new Date(), status: ConfigurationStatus.ARCHIVED },
    });
  }

  async getNextVersion(providerKey: string, workspaceId?: string | null, accountId?: string | null): Promise<number> {
    const latest = await this.call<{ version: number } | null>(
      'marketplaceProviderConfigRecord',
      'findFirst',
      {
        where: {
          providerKey: providerKey.toUpperCase(),
          deletedAt: null,
          workspaceId: workspaceId ?? null,
          ...(accountId ? { accountId } : {}),
        },
        orderBy: { version: 'desc' },
        select: { version: true },
      },
    );
    return (latest?.version ?? 0) + 1;
  }

  // ── History ────────────────────────────────────────────────

  async createHistory(data: Record<string, unknown>): Promise<void> {
    await this.call<unknown>('marketplaceProviderConfigHistory', 'create', { data });
  }

  async findHistory(configId: string): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('marketplaceProviderConfigHistory', 'findMany', {
      where: { configId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findHistoryByVersion(configId: string, version: number): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('marketplaceProviderConfigHistory', 'findFirst', {
      where: { configId, version },
    });
  }

  // ── Internals ─────────────────────────────────────────────

  private buildWhere(filter: ConfigurationFilterOptions): Record<string, unknown> {
    const where: Record<string, unknown> = { deletedAt: null };

    if (filter.workspaceId) {
      where['OR'] = [{ workspaceId: filter.workspaceId }, { workspaceId: null }];
    }
    if (filter.providerKey) {
      where['providerKey'] = filter.providerKey.toUpperCase();
    }
    if (filter.accountId) {
      where['accountId'] = filter.accountId;
    }
    if (filter.scope) {
      where['scope'] = filter.scope;
    }
    if (filter.status) {
      where['status'] = Array.isArray(filter.status)
        ? { in: filter.status }
        : filter.status;
    }
    if (filter.search) {
      where['OR'] = [
        ...(Array.isArray(where['OR']) ? (where['OR'] as unknown[]) : []),
        { name: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }
}
