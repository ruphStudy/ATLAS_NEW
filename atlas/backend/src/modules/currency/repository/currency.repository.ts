import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { CurrencyFilterOptions, ExchangeRateFilterOptions } from '../interfaces';
import { CURRENCY_CONSTANTS } from '../constants';

@Injectable()
export class CurrencyRepository extends BaseRepository {
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

  // ── Currency ────────────────────────────────────────────────

  async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('currency', 'create', { data });
  }

  async findById(id: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('currency', 'findFirst', {
      where: { id, deletedAt: null },
    });
  }

  async findByCode(code: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('currency', 'findFirst', {
      where: { code: code.toUpperCase(), deletedAt: null },
    });
  }

  async findAll(filter: CurrencyFilterOptions): Promise<[Record<string, unknown>[], number]> {
    const where = this.buildWhere(filter);
    const sortField = CURRENCY_CONSTANTS.SORT_FIELDS[filter.sortBy ?? 'code'] ?? 'code';
    const orderBy = { [sortField]: filter.sortOrder ?? 'asc' };
    const take = Math.min(filter.limit ?? CURRENCY_CONSTANTS.DEFAULT_PAGE_SIZE, CURRENCY_CONSTANTS.MAX_PAGE_SIZE);
    const skip = filter.page ? (filter.page - 1) * take : 0;

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('currency', 'findMany', { where, orderBy, take, skip }),
      this.call<number>('currency', 'count', { where }),
    ]);
    return [items, total];
  }

  async update(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('currency', 'update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async softDelete(id: string, userId?: string): Promise<Record<string, unknown>> {
    return this.update(id, { deletedAt: new Date(), updatedBy: userId });
  }

  private buildWhere(filter: CurrencyFilterOptions): Record<string, unknown> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filter.code) where['code'] = filter.code.toUpperCase();
    if (filter.status) where['status'] = filter.status;
    if (filter.search) {
      where['OR'] = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { code: { contains: filter.search.toUpperCase() } },
      ];
    }
    return where;
  }

  // ── History ─────────────────────────────────────────────────

  async createHistory(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('currencyHistory', 'create', { data });
  }

  async findHistory(currencyId: string, limit = 20): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('currencyHistory', 'findMany', {
      where: { currencyId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ── Workspace Currency Config ──────────────────────────────

  async upsertWorkspaceConfig(data: {
    workspaceId: string;
    [key: string]: unknown;
  }): Promise<Record<string, unknown>> {
    const existing = await this.findWorkspaceConfig(data.workspaceId);
    if (existing) {
      return this.call<Record<string, unknown>>('workspaceCurrencyConfig', 'update', {
        where: { id: (existing as { id: string }).id },
        data: { ...data, updatedAt: new Date() },
      });
    }
    return this.call<Record<string, unknown>>('workspaceCurrencyConfig', 'create', { data });
  }

  async findWorkspaceConfig(workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('workspaceCurrencyConfig', 'findFirst', {
      where: { workspaceId, deletedAt: null },
    });
  }

  // ── Exchange Rates ──────────────────────────────────────────

  async findExactRate(
    baseCurrency: string,
    quoteCurrency: string,
    effectiveAt: Date,
    workspaceId: string | null,
    source: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('exchangeRate', 'findFirst', {
      where: {
        baseCurrency: baseCurrency.toUpperCase(),
        quoteCurrency: quoteCurrency.toUpperCase(),
        effectiveAt,
        workspaceId,
        source,
        deletedAt: null,
      },
    });
  }

  async createRate(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('exchangeRate', 'create', { data });
  }

  /**
   * Finds the most recent PUBLISHED rate effective at or before `asOfDate`
   * (defaults to now), preferring a workspace-scoped rate over the global
   * one when both exist. DRAFT/PENDING_APPROVAL/REJECTED/ARCHIVED rows are
   * never "effective" — only a published rate can be resolved for use.
   */
  async findEffectiveRate(
    baseCurrency: string,
    quoteCurrency: string,
    asOfDate: Date,
    workspaceId?: string | null,
  ): Promise<Record<string, unknown> | null> {
    const where = {
      baseCurrency: baseCurrency.toUpperCase(),
      quoteCurrency: quoteCurrency.toUpperCase(),
      effectiveAt: { lte: asOfDate },
      status: 'PUBLISHED',
      deletedAt: null,
    };

    if (workspaceId) {
      const scoped = await this.call<Record<string, unknown> | null>('exchangeRate', 'findFirst', {
        where: { ...where, workspaceId },
        orderBy: { effectiveAt: 'desc' },
      });
      if (scoped) return scoped;
    }

    return this.call<Record<string, unknown> | null>('exchangeRate', 'findFirst', {
      where: { ...where, workspaceId: null },
      orderBy: { effectiveAt: 'desc' },
    });
  }

  /** Newest PUBLISHED rate for a pair regardless of effective date — used as the abnormal-deviation baseline. */
  async findLatestPublishedRate(
    baseCurrency: string,
    quoteCurrency: string,
    workspaceId?: string | null,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('exchangeRate', 'findFirst', {
      where: {
        baseCurrency: baseCurrency.toUpperCase(),
        quoteCurrency: quoteCurrency.toUpperCase(),
        status: 'PUBLISHED',
        deletedAt: null,
        ...(workspaceId !== undefined ? { workspaceId } : {}),
      },
      orderBy: { effectiveAt: 'desc' },
    });
  }

  async findRateById(id: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('exchangeRate', 'findFirst', {
      where: { id, deletedAt: null },
    });
  }

  async updateRateStatus(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('exchangeRate', 'update', { where: { id }, data });
  }

  async findRates(filter: ExchangeRateFilterOptions): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filter.baseCurrency) where['baseCurrency'] = filter.baseCurrency.toUpperCase();
    if (filter.quoteCurrency) where['quoteCurrency'] = filter.quoteCurrency.toUpperCase();
    if (filter.source) where['source'] = filter.source;
    if (filter.workspaceId !== undefined) where['workspaceId'] = filter.workspaceId;
    if (filter.fromDate || filter.toDate) {
      where['effectiveAt'] = {
        ...(filter.fromDate ? { gte: filter.fromDate } : {}),
        ...(filter.toDate ? { lte: filter.toDate } : {}),
      };
    }

    const take = Math.min(filter.limit ?? CURRENCY_CONSTANTS.DEFAULT_PAGE_SIZE, CURRENCY_CONSTANTS.MAX_PAGE_SIZE);
    const skip = filter.page ? (filter.page - 1) * take : 0;

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('exchangeRate', 'findMany', {
        where,
        orderBy: { effectiveAt: 'desc' },
        take,
        skip,
      }),
      this.call<number>('exchangeRate', 'count', { where }),
    ]);
    return [items, total];
  }

  // ── Exchange Rate Provider Config (priority / fallback) ────

  async upsertProviderConfig(data: {
    providerKey: string;
    workspaceId?: string | null;
    [key: string]: unknown;
  }): Promise<Record<string, unknown>> {
    const existing = await this.call<Record<string, unknown> | null>('exchangeRateProviderConfig', 'findFirst', {
      where: { providerKey: data.providerKey.toUpperCase(), workspaceId: data.workspaceId ?? null, deletedAt: null },
    });
    if (existing) {
      return this.call<Record<string, unknown>>('exchangeRateProviderConfig', 'update', {
        where: { id: (existing as { id: string }).id },
        data: { ...data, updatedAt: new Date() },
      });
    }
    return this.call<Record<string, unknown>>('exchangeRateProviderConfig', 'create', {
      data: { ...data, workspaceId: data.workspaceId ?? null },
    });
  }

  async findProviderConfigs(workspaceId?: string | null): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('exchangeRateProviderConfig', 'findMany', {
      where: {
        deletedAt: null,
        ...(workspaceId ? { OR: [{ workspaceId }, { workspaceId: null }] } : { workspaceId: null }),
      },
      orderBy: { priority: 'asc' },
    });
  }
}
