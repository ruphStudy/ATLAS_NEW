import { Injectable, Logger } from '@nestjs/common';
import { AiModelManagementRepository } from './ai-model-management.repository';
import { AiModelEventQueue } from './jobs';
import {
  RegisterAiModelDto,
  UpdateAiModelDto,
  CreateModelConfigurationDto,
  UpdateModelConfigurationDto,
  AiModelFilterDto,
  ModelResolutionDto,
  ModelConfigurationFilterDto,
  AiModelResponseDto,
  PaginatedAiModelResponseDto,
  AiModelConfigurationResponseDto,
  PaginatedModelConfigurationResponseDto,
  ResolvedModelResponseDto,
  ModelCompatibilityResponseDto,
  ModelDiscoveryResponseDto,
} from './dto';
import {
  IAiModel,
  IAiModelConfiguration,
  AiModelStatus,
  AiModelEvent,
  AiModelCapability,
  IResolvedModel,
} from './interfaces';
import { ResourceNotFoundException } from '@common/exceptions/resource-not-found.exception';
import { BusinessRuleException } from '@common/exceptions/business-rule.exception';
import { DuplicateResourceException } from '@common/exceptions/duplicate-resource.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class AiModelManagementService {
  private readonly logger = new Logger(AiModelManagementService.name);
  private readonly CACHE_TTL_MINUTES = 30;

  constructor(
    private readonly repository: AiModelManagementRepository,
    private readonly eventQueue: AiModelEventQueue,
  ) {}

  async registerModel(dto: RegisterAiModelDto): Promise<IAiModel> {
    const existing = await this.repository.findModelByKey(
      dto.provider,
      dto.modelKey,
      dto.workspaceId,
    );

    if (existing) {
      throw new DuplicateResourceException(
        'Model already registered',
        ErrorCode.DUPLICATE_RESOURCE,
      );
    }

    const data = {
      workspaceId: dto.workspaceId || null,
      provider: dto.provider,
      modelKey: dto.modelKey,
      displayName: dto.displayName,
      version: dto.version,
      status: dto.status ?? AiModelStatus.ACTIVE,
      capabilities: dto.capabilities,
      modalities: dto.modalities,
      contextLimit: dto.contextLimit,
      outputLimit: dto.outputLimit,
      supportsStreaming: dto.supportsStreaming ?? false,
      supportsJsonMode: dto.supportsJsonMode ?? false,
      supportsFunctionCalling: dto.supportsFunctionCalling ?? false,
      supportsVision: dto.supportsVision ?? false,
      regions: dto.regions ?? [],
      pricingInputPer1k: dto.pricingInputPer1k,
      pricingOutputPer1k: dto.pricingOutputPer1k,
      rateLimit: dto.rateLimit,
      rateLimitWindow: dto.rateLimitWindow,
      averageLatency: dto.averageLatency,
      qualityScore: dto.qualityScore,
      availabilityScore: dto.availabilityScore,
      aliases: dto.aliases ?? [],
      metadata: {},
      isDefault: dto.isDefault ?? false,
      isPreferred: dto.isPreferred ?? false,
      isFallback: dto.isFallback ?? false,
    };

    const model = (await this.repository.registerModel(data)) as IAiModel;

    await this.eventQueue.publish({
      event: AiModelEvent.MODEL_REGISTERED,
      workspaceId: model.workspaceId || undefined,
      modelId: model.id,
      provider: model.provider,
      modelKey: model.modelKey,
    });

    await this.invalidateModelCache(model.workspaceId || undefined);

    return model;
  }

  async updateModel(
    id: string,
    dto: UpdateAiModelDto,
    workspaceId?: string,
  ): Promise<IAiModel> {
    await this.findModelById(id, workspaceId);

    const updated = (await this.repository.updateModel(
      id,
      dto,
    )) as IAiModel;

    await this.eventQueue.publish({
      event: AiModelEvent.MODEL_UPDATED,
      workspaceId: updated.workspaceId || undefined,
      modelId: updated.id,
    });

    await this.invalidateModelCache(updated.workspaceId || undefined);

    return updated;
  }

  async enableModel(id: string, workspaceId?: string): Promise<IAiModel> {
    const model = await this.findModelById(id, workspaceId);

    const updated = (await this.repository.updateModel(id, {
      status: AiModelStatus.ACTIVE,
    })) as IAiModel;

    await this.eventQueue.publish({
      event: AiModelEvent.MODEL_ENABLED,
      workspaceId: updated.workspaceId || undefined,
      modelId: updated.id,
    });

    await this.invalidateModelCache(updated.workspaceId || undefined);

    return updated;
  }

  async disableModel(id: string, workspaceId?: string): Promise<IAiModel> {
    const model = await this.findModelById(id, workspaceId);

    const updated = (await this.repository.updateModel(id, {
      status: AiModelStatus.DISABLED,
    })) as IAiModel;

    await this.eventQueue.publish({
      event: AiModelEvent.MODEL_DISABLED,
      workspaceId: updated.workspaceId || undefined,
      modelId: updated.id,
    });

    await this.invalidateModelCache(updated.workspaceId || undefined);

    return updated;
  }

  async deprecateModel(id: string, workspaceId?: string): Promise<IAiModel> {
    const model = await this.findModelById(id, workspaceId);

    const updated = (await this.repository.updateModel(id, {
      status: AiModelStatus.DEPRECATED,
    })) as IAiModel;

    await this.eventQueue.publish({
      event: AiModelEvent.MODEL_DEPRECATED,
      workspaceId: updated.workspaceId || undefined,
      modelId: updated.id,
    });

    await this.invalidateModelCache(updated.workspaceId || undefined);

    return updated;
  }

  async archiveModel(id: string, workspaceId?: string): Promise<IAiModel> {
    const model = await this.findModelById(id, workspaceId);

    const updated = (await this.repository.updateModel(id, {
      status: AiModelStatus.ARCHIVED,
    })) as IAiModel;

    await this.eventQueue.publish({
      event: AiModelEvent.MODEL_ARCHIVED,
      workspaceId: updated.workspaceId || undefined,
      modelId: updated.id,
    });

    await this.invalidateModelCache(updated.workspaceId || undefined);

    return updated;
  }

  async deleteModel(id: string, workspaceId?: string): Promise<void> {
    await this.findModelById(id, workspaceId);
    await this.repository.deleteModel(id);
    await this.invalidateModelCache(workspaceId);
  }

  async findModelById(id: string, workspaceId?: string): Promise<IAiModel> {
    const model = await this.repository.findModelById(id, workspaceId);
    if (!model) {
      throw new ResourceNotFoundException(
        'AI model not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return model as IAiModel;
  }

  async findAllModels(
    filter: AiModelFilterDto,
  ): Promise<PaginatedAiModelResponseDto> {
    const [data, total] = await this.repository.findAllModels(filter);

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data as AiModelResponseDto[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  async createConfiguration(
    dto: CreateModelConfigurationDto,
  ): Promise<IAiModelConfiguration> {
    await this.findModelById(dto.modelId, dto.workspaceId);

    const data = {
      workspaceId: dto.workspaceId,
      modelId: dto.modelId,
      capability: dto.capability,
      useCase: dto.useCase,
      isDefault: dto.isDefault ?? false,
      isPreferred: dto.isPreferred ?? false,
      priority: dto.priority ?? 0,
      fallbackModelIds: dto.fallbackModelIds ?? [],
      maxRetries: dto.maxRetries,
      timeout: dto.timeout,
      temperature: dto.temperature,
      maxTokens: dto.maxTokens,
      enabled: dto.enabled ?? true,
      metadata: {},
    };

    const config = (await this.repository.createConfiguration(
      data,
    )) as IAiModelConfiguration;

    await this.eventQueue.publish({
      event: AiModelEvent.CONFIGURATION_UPDATED,
      workspaceId: config.workspaceId,
      configurationId: config.id,
      capability: config.capability,
    });

    await this.invalidateModelCache(config.workspaceId);

    return config;
  }

  async updateConfiguration(
    id: string,
    workspaceId: string,
    dto: UpdateModelConfigurationDto,
  ): Promise<IAiModelConfiguration> {
    await this.findConfigurationById(id, workspaceId);

    const updated = (await this.repository.updateConfiguration(
      id,
      workspaceId,
      dto,
    )) as IAiModelConfiguration;

    await this.eventQueue.publish({
      event: AiModelEvent.CONFIGURATION_UPDATED,
      workspaceId: updated.workspaceId,
      configurationId: updated.id,
      capability: updated.capability,
    });

    await this.invalidateModelCache(updated.workspaceId);

    return updated;
  }

  async deleteConfiguration(id: string, workspaceId: string): Promise<void> {
    await this.findConfigurationById(id, workspaceId);
    await this.repository.deleteConfiguration(id, workspaceId);
    await this.invalidateModelCache(workspaceId);
  }

  async findConfigurationById(
    id: string,
    workspaceId: string,
  ): Promise<IAiModelConfiguration> {
    const config = await this.repository.findConfigurationById(id, workspaceId);
    if (!config) {
      throw new ResourceNotFoundException(
        'Model configuration not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return config as IAiModelConfiguration;
  }

  async findAllConfigurations(
    filter: ModelConfigurationFilterDto,
  ): Promise<PaginatedModelConfigurationResponseDto> {
    const [data, total] = await this.repository.findAllConfigurations(filter);

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data as AiModelConfigurationResponseDto[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  async resolveModel(dto: ModelResolutionDto): Promise<ResolvedModelResponseDto> {
    const cacheKey = this.buildCacheKey('resolve', dto);
    
    const cached = await this.repository.getCachedMetadata(cacheKey);
    if (cached) {
      return cached as IResolvedModel;
    }

    let model: IAiModel | null = null;
    let configuration: IAiModelConfiguration | null = null;

    if (dto.workspaceId && dto.capability) {
      const config = await this.repository.findConfigurationByCapability(
        dto.workspaceId,
        dto.capability,
        dto.useCase,
      );

      if (config) {
        configuration = config as IAiModelConfiguration;
        model = (config['model'] as unknown) as IAiModel;
      }
    }

    if (!model && dto.capability) {
      const models = await this.repository.findModelsByCapability(
        dto.capability,
        dto.workspaceId,
      );

      if (models.length > 0) {
        model = models[0] as IAiModel;
      }
    }

    if (!model) {
      throw new ResourceNotFoundException(
        'No suitable model found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    const fallbackIds = configuration?.fallbackModelIds || [];
    const fallbacks: IAiModel[] = [];

    for (const fallbackId of fallbackIds) {
      try {
        const fallback = await this.findModelById(fallbackId, dto.workspaceId);
        fallbacks.push(fallback);
      } catch (error) {
        this.logger.warn(`Fallback model ${fallbackId} not found`);
      }
    }

    const resolved: IResolvedModel = {
      model,
      configuration: configuration || undefined,
      fallbacks,
      reason: configuration
        ? 'Resolved from workspace configuration'
        : 'Resolved from global registry',
    };

    await this.repository.setCachedMetadata(
      dto.workspaceId || null,
      cacheKey,
      resolved as unknown as Record<string, unknown>,
      this.CACHE_TTL_MINUTES,
    );

    await this.eventQueue.publish({
      event: AiModelEvent.MODEL_RESOLVED,
      workspaceId: dto.workspaceId,
      modelId: model.id,
      capability: dto.capability,
    });

    return resolved;
  }

  async validateCompatibility(
    modelId: string,
    capability: AiModelCapability,
    workspaceId?: string,
  ): Promise<ModelCompatibilityResponseDto> {
    const model = await this.findModelById(modelId, workspaceId);

    const compatible = model.capabilities.includes(capability);

    const missingFeatures: string[] = [];

    await this.eventQueue.publish({
      event: AiModelEvent.COMPATIBILITY_VALIDATED,
      workspaceId: model.workspaceId || undefined,
      modelId: model.id,
      capability,
      compatible,
    });

    return {
      compatible,
      model,
      capability,
      reason: compatible
        ? 'Model supports the requested capability'
        : 'Model does not support the requested capability',
      missingFeatures: compatible ? undefined : missingFeatures,
    };
  }

  async discoverModels(
    provider?: string,
    capability?: string,
    region?: string,
    workspaceId?: string,
  ): Promise<ModelDiscoveryResponseDto> {
    const filter: AiModelFilterDto = {
      workspaceId,
      provider,
      capability,
      region,
    };

    const [models, total] = await this.repository.findAllModels(filter);

    return {
      models: models as AiModelResponseDto[],
      total,
      filters: {
        provider,
        capability,
        region,
      },
    };
  }

  async invalidateModelCache(workspaceId?: string): Promise<number> {
    const pattern = workspaceId ? `model:${workspaceId}` : 'model:';
    const count = await this.repository.invalidateCache(pattern);

    await this.eventQueue.publish({
      event: AiModelEvent.CACHE_INVALIDATED,
      workspaceId,
    });

    return count;
  }

  private buildCacheKey(prefix: string, filter: Record<string, unknown>): string {
    const parts = [prefix];
    
    if (filter.workspaceId) parts.push(`w:${filter.workspaceId}`);
    if (filter.provider) parts.push(`p:${filter.provider}`);
    if (filter.capability) parts.push(`c:${filter.capability}`);
    if (filter.useCase) parts.push(`u:${filter.useCase}`);
    if (filter.region) parts.push(`r:${filter.region}`);

    return `model:${parts.join(':')}`;
  }
}
