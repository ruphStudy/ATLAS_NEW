import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { CountryFilterOptions, CountryProviderAvailabilityFilter } from '../interfaces';
import { COUNTRY_CONSTANTS } from '../constants';

@Injectable()
export class CountryRepository extends BaseRepository {
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

  // ── Country ─────────────────────────────────────────────────

  async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('country', 'create', { data });
  }

  async findById(id: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('country', 'findFirst', {
      where: { id, deletedAt: null },
    });
  }

  async findByCode(code: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('country', 'findFirst', {
      where: { code: code.toUpperCase(), deletedAt: null },
    });
  }

  async findAll(filter: CountryFilterOptions): Promise<[Record<string, unknown>[], number]> {
    const where = this.buildWhere(filter);
    const sortField = COUNTRY_CONSTANTS.SORT_FIELDS[filter.sortBy ?? 'name'] ?? 'name';
    const orderBy = { [sortField]: filter.sortOrder ?? 'asc' };
    const take = Math.min(filter.limit ?? COUNTRY_CONSTANTS.DEFAULT_PAGE_SIZE, COUNTRY_CONSTANTS.MAX_PAGE_SIZE);
    const skip = filter.page ? (filter.page - 1) * take : 0;

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('country', 'findMany', { where, orderBy, take, skip }),
      this.call<number>('country', 'count', { where }),
    ]);
    return [items, total];
  }

  async update(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('country', 'update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async softDelete(id: string, userId?: string): Promise<Record<string, unknown>> {
    return this.update(id, { deletedAt: new Date(), updatedBy: userId });
  }

  private buildWhere(filter: CountryFilterOptions): Record<string, unknown> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filter.code) where['code'] = filter.code.toUpperCase();
    if (filter.region) where['region'] = filter.region;
    if (filter.status) where['status'] = filter.status;
    if (filter.search) {
      where['OR'] = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { code: { contains: filter.search.toUpperCase() } },
      ];
    }
    return where;
  }

  // ── Region Grouping ────────────────────────────────────────────

  async findDistinctRegions(): Promise<string[]> {
    const rows = await this.call<{ region: string | null }[]>('country', 'findMany', {
      where: { deletedAt: null, region: { not: null } },
      distinct: ['region'],
      select: { region: true },
      orderBy: { region: 'asc' },
    });
    return rows.map((r) => r.region).filter((r): r is string => !!r);
  }

  // ── History ─────────────────────────────────────────────────

  async createHistory(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('countryHistory', 'create', { data });
  }

  async findHistory(countryId: string, limit = 20): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('countryHistory', 'findMany', {
      where: { countryId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ── Workspace Country Config ──────────────────────────────────

  async upsertWorkspaceConfig(data: {
    workspaceId: string;
    countryCode: string;
    [key: string]: unknown;
  }): Promise<Record<string, unknown>> {
    const existing = await this.findWorkspaceConfig(data.workspaceId, data.countryCode);
    if (existing) {
      return this.call<Record<string, unknown>>('workspaceCountryConfig', 'update', {
        where: { id: (existing as { id: string }).id },
        data: { ...data, updatedAt: new Date() },
      });
    }
    return this.call<Record<string, unknown>>('workspaceCountryConfig', 'create', { data });
  }

  async findWorkspaceConfig(workspaceId: string, countryCode: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('workspaceCountryConfig', 'findFirst', {
      where: { workspaceId, countryCode: countryCode.toUpperCase(), deletedAt: null },
    });
  }

  async findWorkspaceConfigs(workspaceId: string): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('workspaceCountryConfig', 'findMany', {
      where: { workspaceId, deletedAt: null },
      orderBy: { priority: 'asc' },
    });
  }

  async clearDefault(workspaceId: string, exceptCountryCode?: string): Promise<void> {
    await this.call('workspaceCountryConfig', 'updateMany', {
      where: {
        workspaceId,
        deletedAt: null,
        isDefault: true,
        ...(exceptCountryCode ? { countryCode: { not: exceptCountryCode.toUpperCase() } } : {}),
      },
      data: { isDefault: false },
    });
  }

  async softDeleteWorkspaceConfig(id: string, userId?: string): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('workspaceCountryConfig', 'update', {
      where: { id },
      data: { deletedAt: new Date(), updatedBy: userId, updatedAt: new Date() },
    });
  }

  // ── Overrides ─────────────────────────────────────────────────

  async createOverride(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('countryOverride', 'create', { data });
  }

  async findOverrides(
    countryCode: string,
    workspaceId?: string | null,
    organizationId?: string | null,
  ): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('countryOverride', 'findMany', {
      where: {
        countryCode: countryCode.toUpperCase(),
        deletedAt: null,
        OR: [
          { workspaceId: null, organizationId: null },
          ...(organizationId ? [{ organizationId }] : []),
          ...(workspaceId ? [{ workspaceId }] : []),
        ],
      },
      orderBy: { priority: 'asc' },
    });
  }

  // ── Provider Availability ────────────────────────────────────

  async upsertProviderAvailability(data: {
    countryCode: string;
    domain: string;
    providerKey: string;
    workspaceId?: string | null;
    [key: string]: unknown;
  }): Promise<Record<string, unknown>> {
    const existing = await this.call<Record<string, unknown> | null>('countryProviderAvailability', 'findFirst', {
      where: {
        countryCode: data.countryCode.toUpperCase(),
        domain: data.domain,
        providerKey: data.providerKey,
        workspaceId: data.workspaceId ?? null,
        deletedAt: null,
      },
    });

    if (existing) {
      return this.call<Record<string, unknown>>('countryProviderAvailability', 'update', {
        where: { id: (existing as { id: string }).id },
        data: { ...data, updatedAt: new Date() },
      });
    }
    return this.call<Record<string, unknown>>('countryProviderAvailability', 'create', {
      data: { ...data, workspaceId: data.workspaceId ?? null },
    });
  }

  async findProviderAvailability(
    countryCode: string,
    filter?: CountryProviderAvailabilityFilter,
  ): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('countryProviderAvailability', 'findMany', {
      where: {
        countryCode: countryCode.toUpperCase(),
        deletedAt: null,
        ...(filter?.domain ? { domain: filter.domain } : {}),
        ...(filter?.providerKey ? { providerKey: filter.providerKey } : {}),
        ...(filter?.workspaceId !== undefined
          ? { OR: [{ workspaceId: filter.workspaceId }, { workspaceId: null }] }
          : {}),
      },
      orderBy: { providerKey: 'asc' },
    });
  }

  async softDeleteProviderAvailability(id: string, userId?: string): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('countryProviderAvailability', 'update', {
      where: { id },
      data: { deletedAt: new Date(), updatedBy: userId, updatedAt: new Date() },
    });
  }
}
