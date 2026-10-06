import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { AiModelFilterDto, ModelConfigurationFilterDto } from './dto';

@Injectable()
export class AiModelManagementRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get modelModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'aiModel'
    ] as Record<string, unknown>;
  }

  private get configModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'aiModelConfiguration'
    ] as Record<string, unknown>;
  }

  private get cacheModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'aiModelMetadataCache'
    ] as Record<string, unknown>;
  }

  private callModel<T>(method: string, args: unknown): Promise<T> {
    return (this.modelModel[method] as (a: unknown) => Promise<T>)(args);
  }

  private callConfig<T>(method: string, args: unknown): Promise<T> {
    return (this.configModel[method] as (a: unknown) => Promise<T>)(args);
  }

  private callCache<T>(method: string, args: unknown): Promise<T> {
    return (this.cacheModel[method] as (a: unknown) => Promise<T>)(args);
  }

  async registerModel(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.callModel<Record<string, unknown>>('create', { data });
  }

  async findModelById(
    id: string,
    workspaceId?: string,
  ): Promise<Record<string, unknown> | null> {
    const where: Record<string, unknown> = { id, deletedAt: null };
    if (workspaceId !== undefined) {
      where['OR'] = [{ workspaceId }, { workspaceId: null }];
    }

    return this.callModel<Record<string, unknown> | null>('findFirst', { where });
  }

  async findModelByKey(
    provider: string,
    modelKey: string,
    workspaceId?: string,
  ): Promise<Record<string, unknown> | null> {
    const where: Record<string, unknown> = {
      provider,
      modelKey,
      deletedAt: null,
    };

    if (workspaceId !== undefined) {
      where['OR'] = [{ workspaceId }, { workspaceId: null }];
    }

    return this.callModel<Record<string, unknown> | null>('findFirst', { where });
  }

  async findAllModels(
    filter: AiModelFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = { deletedAt: null };

    if (filter.workspaceId !== undefined) {
      where['OR'] = [{ workspaceId: filter.workspaceId }, { workspaceId: null }];
    }

    if (filter.provider) where['provider'] = filter.provider;
    if (filter.status) where['status'] = filter.status;

    if (filter.capability) {
      where['capabilities'] = { has: filter.capability };
    }

    if (filter.modality) {
      where['modalities'] = { has: filter.modality };
    }

    if (filter.region) {
      where['regions'] = { has: filter.region };
    }

    if (filter.supportsStreaming !== undefined) {
      where['supportsStreaming'] = filter.supportsStreaming;
    }

    if (filter.supportsJsonMode !== undefined) {
      where['supportsJsonMode'] = filter.supportsJsonMode;
    }

    if (filter.supportsFunctionCalling !== undefined) {
      where['supportsFunctionCalling'] = filter.supportsFunctionCalling;
    }

    if (filter.supportsVision !== undefined) {
      where['supportsVision'] = filter.supportsVision;
    }

    if (filter.search) {
      where['OR'] = [
        { displayName: { contains: filter.search, mode: 'insensitive' } },
        { modelKey: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.callModel<Record<string, unknown>[]>('findMany', {
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.callModel<number>('count', { where }),
    ]);

    return [data, total];
  }

  async updateModel(
    id: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.callModel<Record<string, unknown>>('update', {
      where: { id },
      data,
    });
  }

  async deleteModel(id: string): Promise<void> {
    await this.callModel('update', {
      where: { id },
      data: { deletedAt: new Date() },
    });
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

  async findAllConfigurations(
    filter: ModelConfigurationFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      workspaceId: filter.workspaceId,
      deletedAt: null,
    };

    if (filter.modelId) where['modelId'] = filter.modelId;
    if (filter.capability) where['capability'] = filter.capability;
    if (filter.useCase) where['useCase'] = filter.useCase;
    if (filter.isDefault !== undefined) where['isDefault'] = filter.isDefault;
    if (filter.enabled !== undefined) where['enabled'] = filter.enabled;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.callConfig<Record<string, unknown>[]>('findMany', {
        where,
        orderBy: { priority: 'desc' },
        skip,
        take: limit,
        include: { model: true },
      }),
      this.callConfig<number>('count', { where }),
    ]);

    return [data, total];
  }

  async findConfigurationByCapability(
    workspaceId: string,
    capability: string,
    useCase?: string,
  ): Promise<Record<string, unknown> | null> {
    const where: Record<string, unknown> = {
      workspaceId,
      capability,
      deletedAt: null,
      enabled: true,
    };

    if (useCase) where['useCase'] = useCase;

    return this.callConfig<Record<string, unknown> | null>('findFirst', {
      where,
      orderBy: [{ isDefault: 'desc' }, { isPreferred: 'desc' }, { priority: 'desc' }],
      include: { model: true },
    });
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

  async getCachedMetadata(cacheKey: string): Promise<Record<string, unknown> | null> {
    const cached = await this.callCache<Record<string, unknown> | null>(
      'findFirst',
      {
        where: {
          cacheKey,
          expiresAt: { gte: new Date() },
        },
      },
    );

    return cached ? (cached['cacheData'] as Record<string, unknown>) : null;
  }

  async setCachedMetadata(
    workspaceId: string | null,
    cacheKey: string,
    data: Record<string, unknown>,
    ttlMinutes: number,
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);

    await this.callCache('upsert', {
      where: { cacheKey },
      create: {
        workspaceId,
        cacheKey,
        cacheData: data,
        expiresAt,
      },
      update: {
        cacheData: data,
        expiresAt,
      },
    });
  }

  async invalidateCache(pattern?: string): Promise<number> {
    const where: Record<string, unknown> = {};
    if (pattern) {
      where['cacheKey'] = { contains: pattern };
    }

    const result = (await this.callCache('deleteMany', { where })) as {
      count: number;
    };
    return result.count;
  }

  async findModelsByCapability(
    capability: string,
    workspaceId?: string,
  ): Promise<Record<string, unknown>[]> {
    const where: Record<string, unknown> = {
      capabilities: { has: capability },
      status: 'ACTIVE',
      deletedAt: null,
    };

    if (workspaceId !== undefined) {
      where['OR'] = [{ workspaceId }, { workspaceId: null }];
    }

    return this.callModel<Record<string, unknown>[]>('findMany', {
      where,
      orderBy: [
        { isDefault: 'desc' },
        { isPreferred: 'desc' },
        { qualityScore: 'desc' },
      ],
    });
  }
}
