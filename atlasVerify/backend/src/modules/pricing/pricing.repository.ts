import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { IPricingConfig, PricingStatus, PricingStrategy } from './interfaces';
import type { PricingRecordFilterDto, PricingConfigFilterDto } from './dto';
import { PRICING_CONSTANTS } from './constants';

@Injectable()
export class PricingRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get configModel() {
    return (this.prisma as unknown as Record<string, unknown>)['pricingConfig'] as Record<string, unknown>;
  }

  private get recordModel() {
    return (this.prisma as unknown as Record<string, unknown>)['pricingRecord'] as Record<string, unknown>;
  }

  private get historyModel() {
    return (this.prisma as unknown as Record<string, unknown>)['pricingHistory'] as Record<string, unknown>;
  }

  private callConfig<T>(method: string, args: unknown): Promise<T> {
    return (this.configModel[method] as (a: unknown) => Promise<T>)(args);
  }

  private callRecord<T>(method: string, args: unknown): Promise<T> {
    return (this.recordModel[method] as (a: unknown) => Promise<T>)(args);
  }

  private callHistory<T>(method: string, args: unknown): Promise<T> {
    return (this.historyModel[method] as (a: unknown) => Promise<T>)(args);
  }

  // ── Config ──────────────────────────────────────────────────

  async createConfig(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.callConfig<Record<string, unknown>>('create', { data });
  }

  async findConfigById(id: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.callConfig<Record<string, unknown> | null>('findFirst', {
      where: { id, workspaceId, deletedAt: null },
    });
  }

  async findActiveConfig(
    workspaceId: string,
    marketplaceKey: string,
    country?: string,
  ): Promise<IPricingConfig | null> {
    const raw = await this.callConfig<Record<string, unknown> | null>('findFirst', {
      where: {
        workspaceId,
        marketplaceKey,
        isActive: true,
        deletedAt: null,
        country: country ?? 'GLOBAL',
      },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
    return raw ? this.rawToConfig(raw) : null;
  }

  async findAllConfigs(
    workspaceId: string,
    filter: PricingConfigFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      workspaceId,
      deletedAt: null,
      ...(filter.marketplaceKey && { marketplaceKey: filter.marketplaceKey }),
      ...(filter.country && { country: filter.country }),
      ...(filter.isActive !== undefined && { isActive: filter.isActive }),
      ...(filter.strategy && { strategy: filter.strategy }),
    };

    const [items, total] = await Promise.all([
      this.callConfig<Record<string, unknown>[]>('findMany', {
        where,
        orderBy: { createdAt: 'desc' },
        skip: filter.skip,
        take: filter.limit,
      }),
      this.callConfig<number>('count', { where }),
    ]);
    return [items, total];
  }

  async updateConfig(id: string, workspaceId: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.callConfig<Record<string, unknown>>('update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async softDeleteConfig(id: string): Promise<void> {
    await this.callConfig<unknown>('update', { where: { id }, data: { deletedAt: new Date() } });
  }

  // ── Record ──────────────────────────────────────────────────

  async createRecord(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.callRecord<Record<string, unknown>>('create', { data });
  }

  async findRecordById(id: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.callRecord<Record<string, unknown> | null>('findFirst', {
      where: { id, workspaceId, deletedAt: null },
    });
  }

  async findLatestRecord(
    catalogProductId: string,
    workspaceId: string,
    marketplaceKey: string,
    country?: string,
  ): Promise<Record<string, unknown> | null> {
    return this.callRecord<Record<string, unknown> | null>('findFirst', {
      where: {
        catalogProductId,
        workspaceId,
        marketplaceKey,
        deletedAt: null,
        ...(country && { country }),
      },
      orderBy: { version: 'desc' },
    });
  }

  async getNextVersion(
    catalogProductId: string,
    workspaceId: string,
    marketplaceKey: string,
  ): Promise<number> {
    const latest = await this.callRecord<{ version: number } | null>('findFirst', {
      where: { catalogProductId, workspaceId, marketplaceKey },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    return latest ? latest.version + 1 : 1;
  }

  async findAllRecords(
    workspaceId: string,
    filter: PricingRecordFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const statuses = filter.status
      ? Array.isArray(filter.status) ? filter.status : [filter.status]
      : undefined;

    const where: Record<string, unknown> = {
      workspaceId,
      deletedAt: null,
      ...(filter.catalogProductId && { catalogProductId: filter.catalogProductId }),
      ...(filter.marketplaceKey && { marketplaceKey: filter.marketplaceKey }),
      ...(filter.country && { country: filter.country }),
      ...(statuses && { status: { in: statuses } }),
      ...(filter.strategy && { strategy: filter.strategy }),
    };

    const sortField = PRICING_CONSTANTS.SORT_FIELDS[filter.sortBy ?? 'createdAt'] ?? 'createdAt';

    const [items, total] = await Promise.all([
      this.callRecord<Record<string, unknown>[]>('findMany', {
        where,
        orderBy: { [sortField]: filter.sortOrder ?? 'desc' },
        skip: filter.skip,
        take: filter.limit,
      }),
      this.callRecord<number>('count', { where }),
    ]);
    return [items, total];
  }

  async findRecordsByProduct(
    catalogProductId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.callRecord<Record<string, unknown>[]>('findMany', {
      where: { catalogProductId, workspaceId, deletedAt: null },
      orderBy: [{ marketplaceKey: 'asc' }, { version: 'desc' }],
    });
  }

  async updateRecord(
    id: string,
    workspaceId: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.callRecord<Record<string, unknown>>('update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async softDeleteRecord(id: string): Promise<void> {
    await this.callRecord<unknown>('update', { where: { id }, data: { deletedAt: new Date() } });
  }

  // ── History ──────────────────────────────────────────────────

  async createHistory(
    pricingRecordId: string,
    workspaceId: string,
    data: {
      strategy: PricingStrategy;
      status: PricingStatus;
      snapshotData: Record<string, unknown>;
      changedBy?: string | null;
      changeNote?: string | null;
    },
  ): Promise<void> {
    const record = await this.callRecord<{ version: number }>('findFirst', {
      where: { id: pricingRecordId },
      select: { version: true },
    });
    await this.callHistory<unknown>('create', {
      data: {
        pricingRecordId,
        workspaceId,
        version: record?.version ?? 1,
        strategy: data.strategy,
        status: data.status,
        snapshotData: data.snapshotData,
        changedBy: data.changedBy ?? null,
        changeNote: data.changeNote ?? null,
        createdAt: new Date(),
      },
    });
  }

  async findHistory(pricingRecordId: string, workspaceId: string): Promise<Record<string, unknown>[]> {
    return this.callHistory<Record<string, unknown>[]>('findMany', {
      where: { pricingRecordId, workspaceId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── Helpers ─────────────────────────────────────────────────

  private rawToConfig(raw: Record<string, unknown>): IPricingConfig {
    return {
      id: raw['id'] as string,
      workspaceId: raw['workspaceId'] as string,
      marketplaceKey: raw['marketplaceKey'] as string,
      country: (raw['country'] as string) ?? 'GLOBAL',
      currency: (raw['currency'] as string) ?? 'USD',
      strategy: raw['strategy'] as PricingStrategy,
      isDefault: (raw['isDefault'] as boolean) ?? false,
      isActive: (raw['isActive'] as boolean) ?? true,
      feeComponents: {
        commissionPct: raw['commissionPct'] as number | null,
        fulfilmentFeeFlat: raw['fulfilmentFeeFlat'] as number | null,
        shippingFeeFlat: raw['shippingFeeFlat'] as number | null,
        paymentProcessingPct: raw['paymentProcessingPct'] as number | null,
        packagingCostFlat: raw['packagingCostFlat'] as number | null,
        advertisingCostPct: raw['advertisingCostPct'] as number | null,
        taxPct: raw['taxPct'] as number | null,
        marketplacePriceAdjustmentPct: raw['marketplacePriceAdjustmentPct'] as number | null,
        regionalPriceAdjustmentPct: raw['regionalPriceAdjustmentPct'] as number | null,
        currencyConversionRate: raw['currencyConversionRate'] as number | null,
      },
      thresholds: {
        targetMarginPct: raw['targetMarginPct'] as number | null,
        targetRoi: raw['targetRoi'] as number | null,
        minProfitFlat: raw['minProfitFlat'] as number | null,
        minMarginPct: raw['minMarginPct'] as number | null,
      },
      rules: raw['rules'] as Record<string, unknown> | null,
      createdBy: raw['createdBy'] as string | null,
      updatedBy: raw['updatedBy'] as string | null,
      createdAt: raw['createdAt'] as Date,
      updatedAt: raw['updatedAt'] as Date,
      deletedAt: raw['deletedAt'] as Date | null,
    };
  }
}
