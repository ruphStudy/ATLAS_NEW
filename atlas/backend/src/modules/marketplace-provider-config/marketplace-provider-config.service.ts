import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  ConfigurationEvent,
  ConfigurationScope,
  ConfigurationStatus,
  IMarketplaceProviderConfig,
  MarketplaceProviderConfigPayload,
} from './interfaces';
import { MarketplaceProviderConfigRepository } from './marketplace-provider-config.repository';
import { MarketplaceProviderConfigValidator } from './validator/marketplace-provider-config.validator';
import { MarketplaceProviderConfigCache } from './cache/marketplace-provider-config.cache';
import { MarketplaceProviderConfigEventQueue } from './jobs/marketplace-provider-config-events.queue';
import { MP_CONFIG_CONSTANTS, CONFIG_ERROR_CODES } from './constants';
import {
  CloneMarketplaceProviderConfigDto,
  ConfigFilterDto,
  ConfigImportDto,
  CreateMarketplaceProviderConfigDto,
  MarketplaceProviderConfigHistoryResponseDto,
  MarketplaceProviderConfigResponseDto,
  PaginatedConfigResponseDto,
  PublishMarketplaceProviderConfigDto,
  RollbackMarketplaceProviderConfigDto,
  UpdateMarketplaceProviderConfigDto,
} from './dto';

@Injectable()
export class MarketplaceProviderConfigService {
  private readonly logger = new Logger(MarketplaceProviderConfigService.name);

  constructor(
    private readonly repository: MarketplaceProviderConfigRepository,
    private readonly validator: MarketplaceProviderConfigValidator,
    private readonly cache: MarketplaceProviderConfigCache,
    private readonly eventQueue: MarketplaceProviderConfigEventQueue,
  ) {}

  // ── Create ────────────────────────────────────────────────

  async createConfig(
    workspaceId: string,
    dto: CreateMarketplaceProviderConfigDto,
    userId?: string,
  ): Promise<MarketplaceProviderConfigResponseDto> {
    const payload = dto.payload ?? {};
    const validationResult = this.validator.validate(payload, {
      providerKey: dto.providerKey,
      isCreate: true,
    });
    if (!validationResult.valid) {
      throw new BadRequestException({
        message: 'Configuration validation failed',
        errors: validationResult.errors,
      });
    }

    const version = await this.repository.getNextVersion(
      dto.providerKey,
      dto.scope === ConfigurationScope.GLOBAL ? null : workspaceId,
      dto.accountId,
    );

    const raw = await this.repository.createConfig({
      workspaceId: dto.scope === ConfigurationScope.GLOBAL ? null : workspaceId,
      scope: dto.scope ?? ConfigurationScope.WORKSPACE,
      providerKey: dto.providerKey.toUpperCase(),
      accountId: dto.accountId,
      name: dto.name,
      description: dto.description,
      status: ConfigurationStatus.DRAFT,
      version,
      payload,
      createdBy: userId,
      updatedBy: userId,
    });

    await this.createHistoryEntry(raw['id'] as string, raw, userId, 'Created');
    await this.publishEvent(ConfigurationEvent.CREATED, raw, userId);

    this.logger.log(`Created config '${raw['id']}' for provider '${dto.providerKey}' in workspace '${workspaceId}'`);
    return MarketplaceProviderConfigResponseDto.from(raw);
  }

  // ── Read ──────────────────────────────────────────────────

  async findAll(
    workspaceId: string,
    filter: ConfigFilterDto,
  ): Promise<PaginatedConfigResponseDto> {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? MP_CONFIG_CONSTANTS.DEFAULT_PAGE_SIZE, MP_CONFIG_CONSTANTS.MAX_PAGE_SIZE);
    const [items, total] = await this.repository.findConfigs({
      ...filter,
      workspaceId,
      page,
      limit,
    });
    return PaginatedConfigResponseDto.from(items, total, page, limit);
  }

  async findById(id: string, workspaceId: string): Promise<MarketplaceProviderConfigResponseDto> {
    const raw = await this.findOrFail(id, workspaceId);
    return MarketplaceProviderConfigResponseDto.from(raw);
  }

  async resolveActiveConfig(
    providerKey: string,
    workspaceId?: string | null,
    accountId?: string | null,
    marketplaceKey?: string | null,
  ): Promise<IMarketplaceProviderConfig | null> {
    const cacheKey = MarketplaceProviderConfigCache.buildKey(providerKey, workspaceId, accountId, marketplaceKey);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const raw = await this.repository.findActiveConfig(providerKey, workspaceId, accountId, marketplaceKey);
    if (!raw) return null;

    const config = raw as unknown as IMarketplaceProviderConfig;
    this.cache.set(cacheKey, config);
    return config;
  }

  // ── Update ────────────────────────────────────────────────

  async updateConfig(
    id: string,
    workspaceId: string,
    dto: UpdateMarketplaceProviderConfigDto,
    userId?: string,
  ): Promise<MarketplaceProviderConfigResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    this.assertMutable(existing);

    const mergedPayload = {
      ...(existing['payload'] as MarketplaceProviderConfigPayload),
      ...dto.payload,
    };

    const validation = this.validator.validate(mergedPayload, { providerKey: existing['providerKey'] as string });
    if (!validation.valid) {
      throw new BadRequestException({ message: 'Validation failed', errors: validation.errors });
    }

    const version = (existing['version'] as number) + 1;
    const raw = await this.repository.updateConfig(id, {
      name: dto.name ?? existing['name'],
      description: dto.description ?? existing['description'],
      payload: mergedPayload,
      version,
      updatedBy: userId,
    });

    await this.createHistoryEntry(id, raw, userId, 'Updated');
    await this.publishEvent(ConfigurationEvent.UPDATED, raw, userId);
    this.cache.invalidate(
      MarketplaceProviderConfigCache.buildKey(raw['providerKey'] as string, raw['workspaceId'] as string),
    );

    return MarketplaceProviderConfigResponseDto.from(raw);
  }

  // ── Status Transitions ────────────────────────────────────

  async publishConfig(
    id: string,
    workspaceId: string,
    dto: PublishMarketplaceProviderConfigDto,
    userId?: string,
  ): Promise<MarketplaceProviderConfigResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    this.assertTransition(existing, ConfigurationStatus.PUBLISHED);

    const raw = await this.repository.updateConfig(id, {
      status: ConfigurationStatus.PUBLISHED,
      publishedVersion: existing['version'],
      approvedBy: dto.approvedBy ?? userId,
      updatedBy: userId,
    });

    await this.createHistoryEntry(id, raw, userId, dto.changeReason ?? 'Published');
    await this.publishEvent(ConfigurationEvent.PUBLISHED, raw, userId);
    this.cache.invalidateByProvider(raw['providerKey'] as string);

    return MarketplaceProviderConfigResponseDto.from(raw);
  }

  async enableConfig(
    id: string,
    workspaceId: string,
    userId?: string,
  ): Promise<MarketplaceProviderConfigResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    this.assertTransition(existing, ConfigurationStatus.PUBLISHED);

    const raw = await this.repository.updateConfig(id, {
      status: ConfigurationStatus.PUBLISHED,
      updatedBy: userId,
    });

    await this.publishEvent(ConfigurationEvent.ENABLED, raw, userId);
    this.cache.invalidateByProvider(raw['providerKey'] as string);
    return MarketplaceProviderConfigResponseDto.from(raw);
  }

  async disableConfig(
    id: string,
    workspaceId: string,
    userId?: string,
  ): Promise<MarketplaceProviderConfigResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    this.assertTransition(existing, ConfigurationStatus.DISABLED);

    const raw = await this.repository.updateConfig(id, {
      status: ConfigurationStatus.DISABLED,
      updatedBy: userId,
    });

    await this.publishEvent(ConfigurationEvent.DISABLED, raw, userId);
    this.cache.invalidateByProvider(raw['providerKey'] as string);
    return MarketplaceProviderConfigResponseDto.from(raw);
  }

  async archiveConfig(
    id: string,
    workspaceId: string,
    userId?: string,
  ): Promise<void> {
    const existing = await this.findOrFail(id, workspaceId);
    this.assertTransition(existing, ConfigurationStatus.ARCHIVED);

    await this.repository.updateConfig(id, {
      status: ConfigurationStatus.ARCHIVED,
      updatedBy: userId,
    });

    await this.publishEvent(ConfigurationEvent.ARCHIVED, existing, userId);
    this.cache.invalidateByProvider(existing['providerKey'] as string);
  }

  async deleteConfig(id: string, workspaceId: string): Promise<void> {
    await this.findOrFail(id, workspaceId);
    await this.repository.softDeleteConfig(id);
    this.cache.flush();
  }

  // ── Versioning / Rollback ─────────────────────────────────

  async rollback(
    id: string,
    workspaceId: string,
    dto: RollbackMarketplaceProviderConfigDto,
    userId?: string,
  ): Promise<MarketplaceProviderConfigResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const historyEntry = await this.repository.findHistoryByVersion(id, dto.toVersion);
    if (!historyEntry) {
      throw new NotFoundException(`Version ${dto.toVersion} not found in history for config '${id}'`);
    }

    const newVersion = (existing['version'] as number) + 1;
    const raw = await this.repository.updateConfig(id, {
      payload: historyEntry['payload'],
      version: newVersion,
      status: ConfigurationStatus.DRAFT,
      updatedBy: userId,
    });

    await this.createHistoryEntry(id, raw, userId, dto.reason ?? `Rolled back to v${dto.toVersion}`);
    await this.publishEvent(ConfigurationEvent.ROLLED_BACK, raw, userId, { rolledBackToVersion: dto.toVersion });
    this.cache.invalidateByProvider(raw['providerKey'] as string);

    return MarketplaceProviderConfigResponseDto.from(raw);
  }

  async getHistory(id: string, workspaceId: string): Promise<MarketplaceProviderConfigHistoryResponseDto[]> {
    await this.findOrFail(id, workspaceId);
    const entries = await this.repository.findHistory(id);
    return entries.map((e) => MarketplaceProviderConfigHistoryResponseDto.from(e));
  }

  // ── Clone / Duplicate ─────────────────────────────────────

  async cloneConfig(
    id: string,
    workspaceId: string,
    dto: CloneMarketplaceProviderConfigDto,
    userId?: string,
  ): Promise<MarketplaceProviderConfigResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const targetWorkspace = dto.targetWorkspaceId ?? workspaceId;

    const version = await this.repository.getNextVersion(
      existing['providerKey'] as string,
      targetWorkspace,
      existing['accountId'] as string | null,
    );

    const raw = await this.repository.createConfig({
      workspaceId: targetWorkspace,
      scope: existing['scope'],
      providerKey: existing['providerKey'],
      accountId: existing['accountId'],
      name: dto.name,
      description: dto.description ?? existing['description'],
      status: ConfigurationStatus.DRAFT,
      version,
      payload: existing['payload'],
      createdBy: userId,
      updatedBy: userId,
    });

    await this.createHistoryEntry(raw['id'] as string, raw, userId, `Cloned from ${id}`);
    await this.publishEvent(ConfigurationEvent.CLONED, raw, userId, { clonedFromId: id });
    return MarketplaceProviderConfigResponseDto.from(raw);
  }

  // ── Import / Export ───────────────────────────────────────

  async importConfig(
    workspaceId: string,
    dto: ConfigImportDto,
    userId?: string,
  ): Promise<MarketplaceProviderConfigResponseDto> {
    const validation = this.validator.validate(dto.payload, { providerKey: dto.providerKey, isCreate: true });
    if (!validation.valid) {
      throw new BadRequestException({ message: 'Import validation failed', errors: validation.errors });
    }

    return this.createConfig(
      workspaceId,
      {
        providerKey: dto.providerKey,
        name: dto.name ?? `Imported config – ${dto.providerKey}`,
        payload: dto.payload,
      },
      userId,
    );
  }

  exportConfig(config: MarketplaceProviderConfigResponseDto): Record<string, unknown> {
    return {
      providerKey: config.providerKey,
      name: config.name,
      description: config.description,
      scope: config.scope,
      payload: config.payload,
      exportedAt: new Date().toISOString(),
      version: config.version,
    };
  }

  // ── Cache Management ──────────────────────────────────────

  invalidateCache(providerKey?: string, workspaceId?: string): void {
    if (providerKey) {
      this.cache.invalidateByProvider(providerKey);
    } else if (workspaceId) {
      this.cache.invalidateByWorkspace(workspaceId);
    } else {
      this.cache.flush();
    }
  }

  // ── Helpers ───────────────────────────────────────────────

  private async findOrFail(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const raw = await this.repository.findConfigById(id, workspaceId);
    if (!raw) throw new NotFoundException(`Marketplace provider configuration '${id}' not found`);
    return raw;
  }

  private assertMutable(raw: Record<string, unknown>): void {
    const status = raw['status'] as ConfigurationStatus;
    if (status === ConfigurationStatus.ARCHIVED) {
      throw new BadRequestException('Cannot modify an archived configuration');
    }
  }

  private assertTransition(raw: Record<string, unknown>, to: ConfigurationStatus): void {
    const current = raw['status'] as ConfigurationStatus;
    const allowed = MP_CONFIG_CONSTANTS.ALLOWED_TRANSITIONS[current];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Cannot transition configuration from '${current}' to '${to}'`,
      );
    }
  }

  private async createHistoryEntry(
    configId: string,
    raw: Record<string, unknown>,
    changedBy?: string,
    changeReason?: string,
  ): Promise<void> {
    await this.repository.createHistory({
      configId,
      workspaceId: raw['workspaceId'],
      providerKey: raw['providerKey'],
      version: raw['version'],
      status: raw['status'],
      payload: raw['payload'],
      changeReason: changeReason ?? null,
      changedBy: changedBy ?? null,
    });
  }

  private async publishEvent(
    event: ConfigurationEvent,
    raw: Record<string, unknown>,
    performedBy?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.eventQueue.enqueue({
      event,
      configId: raw['id'] as string,
      providerKey: raw['providerKey'] as string,
      workspaceId: (raw['workspaceId'] as string) ?? null,
      accountId: (raw['accountId'] as string) ?? null,
      version: raw['version'] as number,
      performedBy: performedBy ?? null,
      metadata,
      timestamp: new Date(),
    });
  }
}
