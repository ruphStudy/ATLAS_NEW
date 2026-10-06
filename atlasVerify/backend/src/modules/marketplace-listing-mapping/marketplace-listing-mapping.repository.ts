import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { MappingStatus, CategoryMappingStatus } from './interfaces';
import type {
  MappingFilterDto,
  CategoryMappingFilterDto,
  TransformationJobFilterDto,
} from './dto';
import { MARKETPLACE_MAPPING_CONSTANTS } from './constants';

@Injectable()
export class MarketplaceListingMappingRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Model Accessors ───────────────────────────────────────

  private model(name: string) {
    return (this.prisma as unknown as Record<string, unknown>)[name] as Record<string, unknown>;
  }

  private call<T>(modelName: string, method: string, args: unknown): Promise<T> {
    const m = this.model(modelName);
    return (m[method] as (a: unknown) => Promise<T>)(args);
  }

  // ── Schema Config ─────────────────────────────────────────

  async createSchema(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('marketplaceSchemaConfig', 'create', { data });
  }

  async findSchemaById(
    id: string,
    workspaceId?: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('marketplaceSchemaConfig', 'findFirst', {
      where: {
        id,
        deletedAt: null,
        ...(workspaceId
          ? { OR: [{ workspaceId }, { workspaceId: null }] }
          : { workspaceId: null }),
      },
    });
  }

  async findSchemas(
    workspaceId: string,
    filter: MappingFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      deletedAt: null,
      OR: [{ workspaceId }, { workspaceId: null }],
      ...(filter.marketplaceKey && { marketplaceKey: filter.marketplaceKey.toUpperCase() }),
      ...(filter.country && { country: filter.country }),
      ...(filter.category !== undefined && { category: filter.category }),
      ...(filter.status && { status: filter.status }),
      ...(filter.schemaVersion && { schemaVersion: filter.schemaVersion }),
    };

    const sortField = MARKETPLACE_MAPPING_CONSTANTS.SORT_FIELDS[filter.sortBy ?? 'createdAt'] ?? 'createdAt';
    const orderBy = { [sortField]: filter.sortOrder ?? 'desc' };
    const skip = filter.skip;
    const take = filter.limit ?? 20;

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('marketplaceSchemaConfig', 'findMany', {
        where, orderBy, skip, take,
      }),
      this.call<number>('marketplaceSchemaConfig', 'count', { where }),
    ]);

    return [items, total];
  }

  async findActiveSchema(
    marketplaceKey: string,
    country: string,
    workspaceId?: string,
    category?: string,
    schemaVersion?: string,
  ): Promise<Record<string, unknown> | null> {
    const now = new Date();
    return this.call<Record<string, unknown> | null>('marketplaceSchemaConfig', 'findFirst', {
      where: {
        marketplaceKey: marketplaceKey.toUpperCase(),
        country,
        status: MappingStatus.PUBLISHED,
        deletedAt: null,
        ...(category ? { category } : {}),
        ...(schemaVersion ? { schemaVersion } : {}),
        OR: [{ workspaceId }, { workspaceId: null }],
        AND: [
          { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }] },
          { OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }] },
        ],
      },
      orderBy: [
        { workspaceId: 'desc' }, // workspace-specific first
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async updateSchema(
    id: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('marketplaceSchemaConfig', 'update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async softDeleteSchema(id: string): Promise<void> {
    await this.call<unknown>('marketplaceSchemaConfig', 'update', {
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ── Category Mappings ──────────────────────────────────────

  async createCategoryMapping(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('marketplaceCategoryMapping', 'create', { data });
  }

  async findCategoryMappings(
    workspaceId: string,
    filter: CategoryMappingFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      OR: [{ workspaceId }, { workspaceId: null }],
      ...(filter.universalCategory && {
        universalCategory: { contains: filter.universalCategory, mode: 'insensitive' },
      }),
      ...(filter.marketplaceKey && { marketplaceKey: filter.marketplaceKey.toUpperCase() }),
      ...(filter.country && { country: filter.country }),
    };

    const skip = filter.skip;
    const take = filter.limit ?? 20;

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('marketplaceCategoryMapping', 'findMany', {
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.call<number>('marketplaceCategoryMapping', 'count', { where }),
    ]);

    return [items, total];
  }

  async findAllCategoryMappingsForResolution(
    marketplaceKey: string,
    workspaceId?: string,
  ): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('marketplaceCategoryMapping', 'findMany', {
      where: {
        marketplaceKey: marketplaceKey.toUpperCase(),
        status: { not: CategoryMappingStatus.INVALID },
        OR: [{ workspaceId }, { workspaceId: null }],
      },
    });
  }

  async updateCategoryMapping(
    id: string,
    workspaceId: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('marketplaceCategoryMapping', 'update', {
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
        version: { increment: 1 },
      },
    });
  }

  // ── Attribute Mappings ─────────────────────────────────────

  async createAttributeMapping(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('marketplaceAttributeMapping', 'create', { data });
  }

  async findAllAttributeMappingsForResolution(
    marketplaceKey: string,
    country: string,
    workspaceId?: string,
  ): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('marketplaceAttributeMapping', 'findMany', {
      where: {
        marketplaceKey: marketplaceKey.toUpperCase(),
        country: { in: [country, 'GLOBAL'] },
        status: MappingStatus.PUBLISHED,
        OR: [{ workspaceId }, { workspaceId: null }],
      },
    });
  }

  async updateAttributeMapping(
    id: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('marketplaceAttributeMapping', 'update', {
      where: { id },
      data: { ...data, updatedAt: new Date(), version: { increment: 1 } },
    });
  }

  // ── Mapping Config ─────────────────────────────────────────

  async createMappingConfig(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('marketplaceMappingConfig', 'create', { data });
  }

  async findMappingConfigById(
    id: string,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('marketplaceMappingConfig', 'findFirst', {
      where: { id, workspaceId, deletedAt: null },
      include: { versionHistory: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
  }

  async findMappingConfigs(
    workspaceId: string,
    filter: MappingFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      workspaceId,
      deletedAt: null,
      ...(filter.marketplaceKey && { marketplaceKey: filter.marketplaceKey.toUpperCase() }),
      ...(filter.country && { country: filter.country }),
      ...(filter.category !== undefined && { category: filter.category }),
      ...(filter.status && { status: filter.status }),
    };

    const sortField = MARKETPLACE_MAPPING_CONSTANTS.SORT_FIELDS[filter.sortBy ?? 'createdAt'] ?? 'createdAt';
    const skip = filter.skip;
    const take = filter.limit ?? 20;

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('marketplaceMappingConfig', 'findMany', {
        where,
        orderBy: { [sortField]: filter.sortOrder ?? 'desc' },
        skip,
        take,
      }),
      this.call<number>('marketplaceMappingConfig', 'count', { where }),
    ]);

    return [items, total];
  }

  async updateMappingConfig(
    id: string,
    workspaceId: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('marketplaceMappingConfig', 'update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async softDeleteMappingConfig(id: string, workspaceId: string): Promise<void> {
    await this.call<unknown>('marketplaceMappingConfig', 'update', {
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ── Version History ────────────────────────────────────────

  async createVersionHistory(data: Record<string, unknown>): Promise<void> {
    await this.call<unknown>('marketplaceMappingVersionHistory', 'create', { data });
  }

  async findVersionHistory(
    configId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('marketplaceMappingVersionHistory', 'findMany', {
      where: { configId, workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findVersionHistoryByVersion(
    configId: string,
    version: number,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('marketplaceMappingVersionHistory', 'findFirst', {
      where: { configId, mappingVersion: version },
    });
  }

  // ── Transformation Jobs ────────────────────────────────────

  async createTransformationJob(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('marketplaceTransformationJob', 'create', { data });
  }

  async findTransformationJobById(
    id: string,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('marketplaceTransformationJob', 'findFirst', {
      where: { id, workspaceId },
    });
  }

  async findTransformationJobs(
    workspaceId: string,
    filter: TransformationJobFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      workspaceId,
      ...(filter.listingId && { listingId: filter.listingId }),
      ...(filter.marketplaceKey && { marketplaceKey: filter.marketplaceKey.toUpperCase() }),
      ...(filter.status && { status: filter.status }),
    };

    const skip = filter.skip;
    const take = filter.limit ?? 20;

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('marketplaceTransformationJob', 'findMany', {
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.call<number>('marketplaceTransformationJob', 'count', { where }),
    ]);

    return [items, total];
  }

  async updateTransformationJob(
    id: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('marketplaceTransformationJob', 'update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async findDuplicateInFlightJob(
    listingId: string,
    workspaceId: string,
    marketplaceKey: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('marketplaceTransformationJob', 'findFirst', {
      where: {
        listingId,
        workspaceId,
        marketplaceKey: marketplaceKey.toUpperCase(),
        status: { in: ['PENDING', 'PROCESSING'] },
        isDryRun: false,
      },
    });
  }
}
