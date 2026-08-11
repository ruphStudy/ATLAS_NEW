import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  ReorderConfigurationFilterDto,
  ReorderRecommendationFilterDto,
} from './dto';

const REORDER_CONFIG_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  priority: 'priority',
  reorderPoint: 'reorderPoint',
};

const REORDER_RECOMMENDATION_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  score: 'score',
  urgency: 'urgency',
  recommendedQuantity: 'recommendedQuantity',
};

@Injectable()
export class ReorderManagementRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get configModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'reorderConfiguration'
    ] as Record<string, unknown>;
  }

  private get recommendationModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'reorderRecommendation'
    ] as Record<string, unknown>;
  }

  private get historyModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'reorderRecommendationHistory'
    ] as Record<string, unknown>;
  }

  private callConfig<T>(method: string, args: unknown): Promise<T> {
    return (this.configModel[method] as (a: unknown) => Promise<T>)(args);
  }

  private callRecommendation<T>(method: string, args: unknown): Promise<T> {
    return (this.recommendationModel[method] as (a: unknown) => Promise<T>)(args);
  }

  private callHistory<T>(method: string, args: unknown): Promise<T> {
    return (this.historyModel[method] as (a: unknown) => Promise<T>)(args);
  }

  async createConfiguration(
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.callConfig<Record<string, unknown>>('create', { data });
  }

  async findConfigurationById(
    id: string,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.callConfig<Record<string, unknown> | null>('findFirst', {
      where: { id, workspaceId, deletedAt: null },
    });
  }

  async findConfigurationByItem(
    inventoryItemId: string,
    workspaceId: string,
    warehouseId?: string,
    marketplaceAccountId?: string,
  ): Promise<Record<string, unknown> | null> {
    return this.callConfig<Record<string, unknown> | null>('findFirst', {
      where: {
        inventoryItemId,
        workspaceId,
        warehouseId: warehouseId || null,
        marketplaceAccountId: marketplaceAccountId || null,
        deletedAt: null,
      },
    });
  }

  async findAllConfigurations(
    workspaceId: string,
    filter: ReorderConfigurationFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      workspaceId,
      deletedAt: null,
    };

    if (filter.inventoryItemId) where['inventoryItemId'] = filter.inventoryItemId;
    if (filter.warehouseId) where['warehouseId'] = filter.warehouseId;
    if (filter.marketplaceAccountId)
      where['marketplaceAccountId'] = filter.marketplaceAccountId;
    if (filter.enabled !== undefined) where['enabled'] = filter.enabled === 'true';

    if (filter.search) {
      where['OR'] = [
        { sku: { contains: filter.search, mode: 'insensitive' } },
        { notes: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const sortBy =
      filter.sortBy && REORDER_CONFIG_SORT_FIELDS[filter.sortBy]
        ? REORDER_CONFIG_SORT_FIELDS[filter.sortBy]
        : 'createdAt';
    const sortOrder = filter.sortOrder === 'asc' ? 'asc' : 'desc';

    const [data, total] = await Promise.all([
      this.callConfig<Record<string, unknown>[]>('findMany', {
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.callConfig<number>('count', { where }),
    ]);

    return [data, total];
  }

  async updateConfiguration(
    id: string,
    workspaceId: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.callConfig<Record<string, unknown>>('update', {
      where: { id, workspaceId },
      data,
    });
  }

  async deleteConfiguration(id: string, workspaceId: string): Promise<void> {
    await this.callConfig('update', {
      where: { id, workspaceId },
      data: { deletedAt: new Date() },
    });
  }

  async getNextRecommendationSequence(workspaceId: string): Promise<number> {
    const last = await this.callRecommendation<Record<string, unknown> | null>(
      'findFirst',
      {
        where: { workspaceId },
        orderBy: { recommendationSequence: 'desc' },
        select: { recommendationSequence: true },
      },
    );
    return ((last?.['recommendationSequence'] as number) ?? 0) + 1;
  }

  async createRecommendation(
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.callRecommendation<Record<string, unknown>>('create', { data });
  }

  async findRecommendationById(
    id: string,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.callRecommendation<Record<string, unknown> | null>('findFirst', {
      where: { id, workspaceId, deletedAt: null },
    });
  }

  async findRecommendationByNumber(
    recommendationNumber: string,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.callRecommendation<Record<string, unknown> | null>('findFirst', {
      where: { recommendationNumber, workspaceId, deletedAt: null },
    });
  }

  async findActiveRecommendationByItem(
    inventoryItemId: string,
    workspaceId: string,
    warehouseId?: string,
  ): Promise<Record<string, unknown> | null> {
    const where: Record<string, unknown> = {
      inventoryItemId,
      workspaceId,
      status: { in: ['PENDING', 'APPROVED', 'SNOOZED'] },
      deletedAt: null,
    };

    if (warehouseId) where['warehouseId'] = warehouseId;

    return this.callRecommendation<Record<string, unknown> | null>('findFirst', {
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllRecommendations(
    workspaceId: string,
    filter: ReorderRecommendationFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      workspaceId,
      deletedAt: null,
    };

    if (filter.inventoryItemId) where['inventoryItemId'] = filter.inventoryItemId;
    if (filter.warehouseId) where['warehouseId'] = filter.warehouseId;
    if (filter.marketplaceAccountId)
      where['marketplaceAccountId'] = filter.marketplaceAccountId;
    if (filter.status) where['status'] = filter.status;
    if (filter.stockLevelStatus) where['stockLevelStatus'] = filter.stockLevelStatus;
    if (filter.urgency) where['urgency'] = filter.urgency;

    if (filter.search) {
      where['OR'] = [
        { recommendationNumber: { contains: filter.search, mode: 'insensitive' } },
        { sku: { contains: filter.search, mode: 'insensitive' } },
        { reason: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const sortBy =
      filter.sortBy && REORDER_RECOMMENDATION_SORT_FIELDS[filter.sortBy]
        ? REORDER_RECOMMENDATION_SORT_FIELDS[filter.sortBy]
        : 'createdAt';
    const sortOrder = filter.sortOrder === 'asc' ? 'asc' : 'desc';

    const [data, total] = await Promise.all([
      this.callRecommendation<Record<string, unknown>[]>('findMany', {
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.callRecommendation<number>('count', { where }),
    ]);

    return [data, total];
  }

  async updateRecommendation(
    id: string,
    workspaceId: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.callRecommendation<Record<string, unknown>>('update', {
      where: { id, workspaceId },
      data,
    });
  }

  async createHistoryEntry(data: Record<string, unknown>): Promise<void> {
    await this.callHistory<Record<string, unknown>>('create', { data });
  }

  async expireOldRecommendations(workspaceId: string): Promise<number> {
    const result = await this.callRecommendation<{ count: number }>('updateMany', {
      where: {
        workspaceId,
        status: { in: ['PENDING', 'SNOOZED'] },
        expiresAt: { lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    });
    return result.count;
  }
}
