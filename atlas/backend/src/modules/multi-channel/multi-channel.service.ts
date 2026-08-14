import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory } from '@modules/audit-logs/interfaces';
import { MarketplaceProviderRegistry } from '@modules/marketplace-provider/registry/marketplace-provider.registry';
import { MarketplaceErrorNormalizer } from '@modules/marketplace-provider/errors/marketplace-error-normalizer';
import { ChannelProviderRegistry } from './registry/channel-provider.registry';
import {
  ChannelEvent,
  ChannelFilterOptions,
  ChannelHealthState,
  ChannelStatus,
  ChannelType,
  IChannel,
  IChannelHealthResult,
  IChannelProductMapping,
} from './interfaces';
import { MultiChannelRepository } from './repository/multi-channel.repository';
import { MultiChannelCache } from './cache/multi-channel.cache';
import { MultiChannelValidator } from './validator/multi-channel.validator';
import { MultiChannelAudit } from './audit/multi-channel.audit';
import { MultiChannelEventQueue } from './events/multi-channel-events.queue';
import { MULTI_CHANNEL_CONSTANTS, MULTI_CHANNEL_ERROR_CODES, MULTI_CHANNEL_MODULE } from './constants';
import {
  ChannelFilterDto,
  ChannelHistoryResponseDto,
  ChannelProductMappingResponseDto,
  ChannelResponseDto,
  CreateChannelProductMappingDto,
  ExecuteChannelOperationDto,
  PaginatedChannelResponseDto,
  RegisterChannelDto,
  ResolveChannelsDto,
  UpdateChannelDto,
  UpdateChannelProductMappingDto,
} from './dto';

@Injectable()
export class MultiChannelService {
  private readonly logger = new Logger(MultiChannelService.name);

  constructor(
    private readonly repository: MultiChannelRepository,
    private readonly cache: MultiChannelCache,
    private readonly validator: MultiChannelValidator,
    private readonly audit: MultiChannelAudit,
    private readonly eventQueue: MultiChannelEventQueue,
    private readonly auditLogsService: AuditLogsService,
    private readonly marketplaceProviderRegistry: MarketplaceProviderRegistry,
    private readonly marketplaceErrorNormalizer: MarketplaceErrorNormalizer,
    private readonly channelProviderRegistry: ChannelProviderRegistry,
  ) {}

  // ── Channel ─────────────────────────────────────────────────

  async registerChannel(dto: RegisterChannelDto, userId?: string): Promise<ChannelResponseDto> {
    const existing = await this.repository.findChannelByKey(dto.workspaceId, dto.channelKey);
    if (existing) {
      throw new ConflictException({
        message: `A channel with key '${dto.channelKey}' already exists in this workspace`,
        code: MULTI_CHANNEL_ERROR_CODES.CHANNEL_DUPLICATE_KEY,
      });
    }

    const validation = await this.validator.validateChannel({
      workspaceId: dto.workspaceId,
      channelType: dto.channelType,
      providerKey: dto.providerKey ?? null,
      marketplaceAccountId: dto.marketplaceAccountId ?? null,
      businessId: dto.businessId ?? null,
      brandId: dto.brandId ?? null,
    });
    if (!validation.valid) {
      throw new BadRequestException({
        message: `Invalid channel: ${validation.issues.map((i) => i.message).join('; ')}`,
        code: MULTI_CHANNEL_ERROR_CODES.INVALID_CHANNEL,
      });
    }

    const currentDefault = await this.repository.findDefaultChannel(dto.workspaceId);
    const raw = await this.repository.createChannel({
      workspaceId: dto.workspaceId,
      organizationId: dto.organizationId ?? null,
      businessId: dto.businessId ?? null,
      brandId: dto.brandId ?? null,
      channelType: dto.channelType,
      channelKey: dto.channelKey,
      providerKey: dto.providerKey ?? null,
      marketplaceAccountId: dto.marketplaceAccountId ?? null,
      externalAccountRef: dto.externalAccountRef ?? null,
      name: dto.name,
      status: ChannelStatus.REGISTERED,
      version: 1,
      isDefault: !currentDefault,
      priority: dto.priority ?? MULTI_CHANNEL_CONSTANTS.DEFAULT_PRIORITY,
      capabilities: dto.capabilities ?? [],
      routingRules: dto.routingRules ?? {},
      rateLimitConfig: dto.rateLimitConfig ?? null,
      retryConfig: dto.retryConfig ?? null,
      regionalSettingsProfileKey: dto.regionalSettingsProfileKey ?? null,
      taxJurisdictionCode: dto.taxJurisdictionCode ?? null,
      complianceProfileKey: dto.complianceProfileKey ?? null,
      settings: dto.settings ?? {},
      metadata: dto.metadata ?? {},
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    const channel = raw as unknown as IChannel;
    await this.audit.logChannelChange(channel, 'Registered', userId);
    this.invalidateChannelCaches(channel);
    await this.publishEvent(ChannelEvent.CHANNEL_REGISTERED, { channelId: channel.id, channelKey: channel.channelKey, workspaceId: channel.workspaceId, channelType: channel.channelType, changedBy: userId });

    return ChannelResponseDto.from(channel);
  }

  async findChannels(filter: ChannelFilterDto): Promise<PaginatedChannelResponseDto> {
    const [raws, total] = await this.repository.findChannels(filter as ChannelFilterOptions);
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? MULTI_CHANNEL_CONSTANTS.DEFAULT_PAGE_SIZE, MULTI_CHANNEL_CONSTANTS.MAX_PAGE_SIZE);
    return {
      items: (raws as unknown as IChannel[]).map((c) => ChannelResponseDto.from(c)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findChannelById(id: string, workspaceId?: string): Promise<ChannelResponseDto> {
    return ChannelResponseDto.from(await this.requireChannel(id, workspaceId));
  }

  async findChannelByKey(workspaceId: string, channelKey: string): Promise<ChannelResponseDto> {
    const cached = this.cache.getChannel(workspaceId, channelKey);
    if (cached) return ChannelResponseDto.from(cached);

    const raw = await this.repository.findChannelByKey(workspaceId, channelKey);
    if (!raw) {
      throw new NotFoundException({ message: `Channel '${channelKey}' not found in this workspace`, code: MULTI_CHANNEL_ERROR_CODES.CHANNEL_NOT_FOUND });
    }
    const channel = raw as unknown as IChannel;
    this.cache.setChannel(channel);
    return ChannelResponseDto.from(channel);
  }

  /**
   * Mutates in place while the channel is still REGISTERED (not yet
   * enabled). Once ACTIVE/DISABLED, an update instead creates a new
   * version — the live row is never touched.
   */
  async updateChannel(id: string, dto: UpdateChannelDto, userId?: string): Promise<ChannelResponseDto> {
    const existing = await this.requireChannel(id);

    const validation = await this.validator.validateChannel({
      workspaceId: existing.workspaceId,
      channelType: existing.channelType,
      providerKey: dto.providerKey ?? existing.providerKey,
      marketplaceAccountId: dto.marketplaceAccountId ?? existing.marketplaceAccountId,
      businessId: dto.businessId ?? existing.businessId,
      brandId: dto.brandId ?? existing.brandId,
    });
    if (!validation.valid) {
      throw new BadRequestException({
        message: `Invalid channel: ${validation.issues.map((i) => i.message).join('; ')}`,
        code: MULTI_CHANNEL_ERROR_CODES.INVALID_CHANNEL,
      });
    }

    if (MULTI_CHANNEL_CONSTANTS.MUTABLE_CHANNEL_STATUSES.has(existing.status)) {
      const raw = await this.repository.updateChannel(id, {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.providerKey !== undefined && { providerKey: dto.providerKey }),
        ...(dto.marketplaceAccountId !== undefined && { marketplaceAccountId: dto.marketplaceAccountId }),
        ...(dto.externalAccountRef !== undefined && { externalAccountRef: dto.externalAccountRef }),
        ...(dto.businessId !== undefined && { businessId: dto.businessId }),
        ...(dto.brandId !== undefined && { brandId: dto.brandId }),
        ...(dto.capabilities !== undefined && { capabilities: dto.capabilities }),
        ...(dto.routingRules !== undefined && { routingRules: dto.routingRules }),
        ...(dto.rateLimitConfig !== undefined && { rateLimitConfig: dto.rateLimitConfig }),
        ...(dto.retryConfig !== undefined && { retryConfig: dto.retryConfig }),
        ...(dto.regionalSettingsProfileKey !== undefined && { regionalSettingsProfileKey: dto.regionalSettingsProfileKey }),
        ...(dto.taxJurisdictionCode !== undefined && { taxJurisdictionCode: dto.taxJurisdictionCode }),
        ...(dto.complianceProfileKey !== undefined && { complianceProfileKey: dto.complianceProfileKey }),
        ...(dto.settings !== undefined && { settings: dto.settings }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.metadata !== undefined && { metadata: dto.metadata }),
        updatedBy: userId ?? null,
      });

      const channel = raw as unknown as IChannel;
      this.invalidateChannelCaches(channel);
      await this.audit.logChannelChange(channel, dto.changeReason ?? 'Updated', userId);
      await this.publishEvent(ChannelEvent.CHANNEL_UPDATED, { channelId: channel.id, channelKey: channel.channelKey, workspaceId: channel.workspaceId, channelType: channel.channelType, changedBy: userId });
      return ChannelResponseDto.from(channel);
    }

    // Immutable (ACTIVE/DISABLED) — create a new version instead of mutating.
    const raw = await this.repository.createChannel({
      workspaceId: existing.workspaceId,
      organizationId: existing.organizationId,
      businessId: dto.businessId ?? existing.businessId,
      brandId: dto.brandId ?? existing.brandId,
      channelType: existing.channelType,
      channelKey: existing.channelKey,
      providerKey: dto.providerKey ?? existing.providerKey,
      marketplaceAccountId: dto.marketplaceAccountId ?? existing.marketplaceAccountId,
      externalAccountRef: dto.externalAccountRef ?? existing.externalAccountRef,
      name: dto.name ?? existing.name,
      status: ChannelStatus.REGISTERED,
      version: existing.version + 1,
      isDefault: existing.isDefault,
      priority: dto.priority ?? existing.priority,
      capabilities: dto.capabilities ?? existing.capabilities,
      routingRules: dto.routingRules ?? existing.routingRules,
      rateLimitConfig: dto.rateLimitConfig ?? existing.rateLimitConfig,
      retryConfig: dto.retryConfig ?? existing.retryConfig,
      regionalSettingsProfileKey: dto.regionalSettingsProfileKey ?? existing.regionalSettingsProfileKey,
      taxJurisdictionCode: dto.taxJurisdictionCode ?? existing.taxJurisdictionCode,
      complianceProfileKey: dto.complianceProfileKey ?? existing.complianceProfileKey,
      settings: dto.settings ?? existing.settings,
      metadata: dto.metadata ?? existing.metadata,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    const versioned = raw as unknown as IChannel;
    await this.audit.logChannelChange(versioned, dto.changeReason ?? 'New version created', userId);
    await this.publishEvent(ChannelEvent.CHANNEL_UPDATED, {
      channelId: versioned.id,
      channelKey: versioned.channelKey,
      workspaceId: versioned.workspaceId,
      channelType: versioned.channelType,
      changedBy: userId,
      metadata: { note: 'new registered version created; original stays live until this one is enabled' },
    });

    return ChannelResponseDto.from(versioned);
  }

  // ── Lifecycle ───────────────────────────────────────────────

  async enableChannel(id: string, userId?: string, reason?: string): Promise<ChannelResponseDto> {
    return this.transitionChannel(id, ChannelStatus.ACTIVE, ChannelEvent.CHANNEL_ENABLED, userId, reason ?? 'Enabled');
  }

  async disableChannel(id: string, userId?: string, reason?: string): Promise<ChannelResponseDto> {
    const existing = await this.requireChannel(id);
    this.assertNotDefault(existing, 'disabled');
    return this.transitionChannel(id, ChannelStatus.DISABLED, ChannelEvent.CHANNEL_DISABLED, userId, reason ?? 'Disabled');
  }

  async archiveChannel(id: string, userId?: string, reason?: string): Promise<ChannelResponseDto> {
    const existing = await this.requireChannel(id);
    this.assertNotDefault(existing, 'archived');
    return this.transitionChannel(id, ChannelStatus.ARCHIVED, ChannelEvent.CHANNEL_ARCHIVED, userId, reason ?? 'Archived');
  }

  async restoreChannel(id: string, userId?: string, reason?: string): Promise<ChannelResponseDto> {
    return this.transitionChannel(id, ChannelStatus.ACTIVE, ChannelEvent.CHANNEL_RESTORED, userId, reason ?? 'Restored');
  }

  private async transitionChannel(id: string, to: ChannelStatus, event: ChannelEvent, userId?: string, reason?: string): Promise<ChannelResponseDto> {
    const existing = await this.requireChannel(id);
    const allowed = MULTI_CHANNEL_CONSTANTS.ALLOWED_CHANNEL_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException({
        message: `Cannot transition channel from '${existing.status}' to '${to}'`,
        code: MULTI_CHANNEL_ERROR_CODES.INVALID_TRANSITION,
      });
    }

    const raw = await this.repository.updateChannel(id, { status: to, updatedBy: userId ?? null });
    const channel = raw as unknown as IChannel;
    this.invalidateChannelCaches(channel);

    await this.audit.logChannelChange(channel, reason ?? `Transitioned to ${to}`, userId);
    await this.publishEvent(event, { channelId: channel.id, channelKey: channel.channelKey, workspaceId: channel.workspaceId, channelType: channel.channelType, changedBy: userId });
    await this.recordCentralAudit(`multi_channel.channel_${to.toLowerCase()}`, channel.workspaceId, userId, { channelKey: channel.channelKey });

    return ChannelResponseDto.from(channel);
  }

  async setDefaultChannel(id: string, userId?: string): Promise<ChannelResponseDto> {
    const existing = await this.requireChannel(id);

    await this.repository.clearDefaultChannel(existing.workspaceId);
    const raw = await this.repository.updateChannel(id, {
      isDefault: true,
      status: existing.status === ChannelStatus.REGISTERED ? ChannelStatus.ACTIVE : existing.status,
      updatedBy: userId ?? null,
    });

    const channel = raw as unknown as IChannel;
    this.invalidateChannelCaches(channel);
    await this.audit.logChannelChange(channel, 'Set as default channel', userId);
    await this.publishEvent(ChannelEvent.DEFAULT_CHANNEL_CHANGED, { channelId: channel.id, channelKey: channel.channelKey, workspaceId: channel.workspaceId, channelType: channel.channelType, changedBy: userId });

    return ChannelResponseDto.from(channel);
  }

  async getChannelHistory(id: string): Promise<ChannelHistoryResponseDto[]> {
    await this.requireChannel(id);
    const raws = await this.repository.findChannelHistory(id);
    return raws.map((r) => ChannelHistoryResponseDto.from(r as any));
  }

  // ── Routing ─────────────────────────────────────────────────

  /** The ACTIVE channels matching this context, ranked by priority (default channel first among ties). */
  async resolveChannels(workspaceId: string, dto: ResolveChannelsDto): Promise<ChannelResponseDto[]> {
    const cacheKey = MultiChannelCache.buildChannelSetKey(workspaceId, dto.businessId, dto.brandId);
    let channels = this.cache.getChannelSet(cacheKey);
    if (!channels) {
      const raws = await this.repository.findActiveChannels(workspaceId, dto.businessId ?? null, dto.brandId ?? null);
      channels = raws as unknown as IChannel[];
      this.cache.setChannelSet(cacheKey, channels);
    }

    let matched = channels;
    if (dto.channelType) matched = matched.filter((c) => c.channelType === dto.channelType);
    if (dto.capability) matched = matched.filter((c) => c.capabilities.includes(dto.capability as string));

    return [...matched]
      .sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0) || b.priority - a.priority)
      .map((c) => ChannelResponseDto.from(c));
  }

  /** Throws a normalized, channel-scoped error when unsupported — never touches any other channel's state. */
  async assertCapability(id: string, capability: string): Promise<void> {
    const channel = await this.requireChannel(id);
    if (!channel.capabilities.includes(capability)) {
      await this.publishEvent(ChannelEvent.CAPABILITY_UNSUPPORTED, {
        channelId: channel.id,
        channelKey: channel.channelKey,
        workspaceId: channel.workspaceId,
        channelType: channel.channelType,
        metadata: { capability },
      });
      throw this.marketplaceErrorNormalizer.wrap(
        new Error(`Unsupported capability '${capability}' for channel '${channel.channelKey}'`),
        channel.providerKey ?? channel.channelKey,
      );
    }
  }

  /** Normalizes MARKETPLACE-type health through the existing provider registry's adapter; other channel types through this module's own `ChannelProviderRegistry`. */
  async checkHealth(id: string): Promise<IChannelHealthResult> {
    const channel = await this.requireChannel(id);

    if (channel.channelType === ChannelType.MARKETPLACE) {
      if (!channel.providerKey || !this.marketplaceProviderRegistry.isRegistered(channel.providerKey)) {
        return { providerKey: channel.providerKey ?? channel.channelKey, channelId: channel.id, status: ChannelHealthState.UNKNOWN, message: 'Provider not registered', checkedAt: new Date() };
      }
      const adapter = this.marketplaceProviderRegistry.get(channel.providerKey);
      const result = await adapter.healthCheck(channel.marketplaceAccountId ?? undefined);
      return {
        providerKey: result.providerKey,
        channelId: channel.id,
        status: result.status as unknown as ChannelHealthState,
        latencyMs: result.latencyMs,
        message: result.message,
        checkedAt: result.checkedAt,
      };
    }

    const adapter = channel.providerKey ? this.channelProviderRegistry.get(channel.providerKey) : undefined;
    if (!adapter) {
      return { providerKey: channel.providerKey ?? channel.channelKey, channelId: channel.id, status: ChannelHealthState.UNKNOWN, message: 'No adapter registered for this channel provider', checkedAt: new Date() };
    }
    return adapter.healthCheck(channel.id);
  }

  // ── Product Mapping ───────────────────────────────────────────

  async createMapping(channelId: string, dto: CreateChannelProductMappingDto, userId?: string): Promise<ChannelProductMappingResponseDto> {
    const channel = await this.requireChannel(channelId);

    const existing = await this.repository.findMapping(channelId, dto.internalProductId);
    if (existing) {
      throw new ConflictException({ message: 'This product is already mapped to this channel', code: MULTI_CHANNEL_ERROR_CODES.MAPPING_ALREADY_EXISTS });
    }

    const raw = await this.repository.createMapping({
      channelId,
      workspaceId: channel.workspaceId,
      internalProductId: dto.internalProductId,
      externalSku: dto.externalSku ?? null,
      externalProductId: dto.externalProductId ?? null,
      externalUrl: dto.externalUrl ?? null,
      syncStatus: 'PENDING',
      metadata: dto.metadata ?? {},
    });

    const mapping = raw as unknown as IChannelProductMapping;
    await this.publishEvent(ChannelEvent.PRODUCT_MAPPED, {
      channelId,
      channelKey: channel.channelKey,
      workspaceId: channel.workspaceId,
      channelType: channel.channelType,
      entityId: dto.internalProductId,
      changedBy: userId,
    });

    return ChannelProductMappingResponseDto.from(mapping);
  }

  async findMappings(channelId: string): Promise<ChannelProductMappingResponseDto[]> {
    const raws = await this.repository.findMappings({ channelId });
    return (raws as unknown as IChannelProductMapping[]).map((m) => ChannelProductMappingResponseDto.from(m));
  }

  async updateMapping(channelId: string, mappingId: string, dto: UpdateChannelProductMappingDto): Promise<ChannelProductMappingResponseDto> {
    await this.requireMapping(channelId, mappingId);
    const raw = await this.repository.updateMapping(mappingId, {
      ...(dto.externalSku !== undefined && { externalSku: dto.externalSku }),
      ...(dto.externalProductId !== undefined && { externalProductId: dto.externalProductId }),
      ...(dto.externalUrl !== undefined && { externalUrl: dto.externalUrl }),
      ...(dto.syncStatus !== undefined && { syncStatus: dto.syncStatus }),
      ...(dto.metadata !== undefined && { metadata: dto.metadata }),
    });
    return ChannelProductMappingResponseDto.from(raw as unknown as IChannelProductMapping);
  }

  async deleteMapping(channelId: string, mappingId: string, userId?: string): Promise<void> {
    const channel = await this.requireChannel(channelId);
    const mapping = await this.requireMapping(channelId, mappingId);
    await this.repository.deleteMapping(mappingId);
    await this.publishEvent(ChannelEvent.PRODUCT_UNMAPPED, {
      channelId,
      channelKey: channel.channelKey,
      workspaceId: channel.workspaceId,
      channelType: channel.channelType,
      entityId: mapping.internalProductId,
      changedBy: userId,
    });
  }

  // ── Idempotent Operations ─────────────────────────────────────

  /**
   * Prevents a channel operation from running twice for the same
   * idempotency key: a prior COMPLETED run returns its stored result
   * without re-executing `work`; a still-PENDING run is rejected as
   * in-progress; a fresh key runs `work` once and records the outcome.
   */
  async executeIdempotent<T extends Record<string, unknown>>(
    channelId: string,
    dto: ExecuteChannelOperationDto,
    work: () => Promise<T>,
  ): Promise<T> {
    const channel = await this.requireChannel(channelId);
    const existing = await this.repository.findOperationLog(channelId, dto.operationType, dto.idempotencyKey);

    if (existing) {
      const status = existing['status'] as string;
      if (status === 'COMPLETED') {
        await this.publishEvent(ChannelEvent.OPERATION_DUPLICATE_PREVENTED, {
          channelId,
          channelKey: channel.channelKey,
          workspaceId: channel.workspaceId,
          channelType: channel.channelType,
          metadata: { operationType: dto.operationType, idempotencyKey: dto.idempotencyKey },
        });
        return existing['resultSnapshot'] as T;
      }
      if (status === 'PENDING') {
        throw new ConflictException({
          message: `Operation '${dto.operationType}' with idempotency key '${dto.idempotencyKey}' is already in progress for this channel`,
          code: MULTI_CHANNEL_ERROR_CODES.OPERATION_IN_PROGRESS,
        });
      }
    }

    let log: Record<string, unknown>;
    if (existing) {
      // A prior FAILED attempt — reclaim it as PENDING before retrying so a concurrent
      // retry of the same key is rejected instead of racing this one.
      log = await this.repository.updateOperationLog(existing['id'] as string, { status: 'PENDING', completedAt: null });
    } else {
      log = await this.repository.createOperationLog({
        channelId,
        workspaceId: channel.workspaceId,
        operationType: dto.operationType,
        idempotencyKey: dto.idempotencyKey,
        status: 'PENDING',
      });
    }

    try {
      const result = await work();
      await this.repository.updateOperationLog(log['id'] as string, {
        status: 'COMPLETED',
        resultSnapshot: result,
        completedAt: new Date(),
      });
      return result;
    } catch (err) {
      const normalized = this.marketplaceErrorNormalizer.normalize(err, channel.providerKey ?? channel.channelKey);
      await this.repository.updateOperationLog(log['id'] as string, {
        status: 'FAILED',
        errorSnapshot: normalized as unknown as Record<string, unknown>,
        completedAt: new Date(),
      });
      throw err;
    }
  }

  // ── Cache ───────────────────────────────────────────────────

  async invalidateCache(workspaceId?: string): Promise<void> {
    if (workspaceId) {
      this.cache.invalidateChannelSetsByWorkspace(workspaceId);
      this.cache.invalidateChannelsByWorkspace(workspaceId);
    } else {
      this.cache.flush();
    }
    await this.publishEvent(ChannelEvent.CACHE_INVALIDATED, { workspaceId: workspaceId ?? null });
  }

  // ── Helpers ─────────────────────────────────────────────────

  private invalidateChannelCaches(channel: IChannel): void {
    this.cache.invalidateChannelsByWorkspace(channel.workspaceId);
    this.cache.invalidateChannelSetsByWorkspace(channel.workspaceId);
  }

  private assertNotDefault(channel: IChannel, action: string): void {
    if (channel.isDefault) {
      throw new BadRequestException({
        message: `Channel '${channel.channelKey}' is the default channel for this workspace and cannot be ${action} — set another channel as default first`,
        code: MULTI_CHANNEL_ERROR_CODES.DEFAULT_CHANNEL_PROTECTED,
      });
    }
  }

  private async requireChannel(id: string, workspaceId?: string): Promise<IChannel> {
    const raw = await this.repository.findChannelById(id, workspaceId);
    if (!raw) {
      throw new NotFoundException({ message: `Channel '${id}' not found`, code: MULTI_CHANNEL_ERROR_CODES.CHANNEL_NOT_FOUND });
    }
    return raw as unknown as IChannel;
  }

  private async requireMapping(channelId: string, mappingId: string): Promise<IChannelProductMapping> {
    const raw = await this.repository.findMappingById(mappingId);
    if (!raw || (raw as Record<string, unknown>)['channelId'] !== channelId) {
      throw new NotFoundException({ message: 'Channel product mapping not found', code: MULTI_CHANNEL_ERROR_CODES.MAPPING_NOT_FOUND });
    }
    return raw as unknown as IChannelProductMapping;
  }

  private async publishEvent(
    event: ChannelEvent,
    fields: {
      channelId?: string | null;
      channelKey?: string | null;
      workspaceId?: string | null;
      channelType?: string | null;
      entityId?: string | null;
      changedBy?: string | null;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.eventQueue.enqueue({
      event,
      channelId: fields.channelId ?? null,
      channelKey: fields.channelKey ?? null,
      workspaceId: fields.workspaceId ?? null,
      channelType: fields.channelType ?? null,
      entityId: fields.entityId ?? null,
      changedBy: fields.changedBy ?? null,
      metadata: fields.metadata,
      timestamp: new Date(),
    });
  }

  private async recordCentralAudit(action: string, workspaceId: string, performedBy?: string, metadata?: Record<string, unknown>): Promise<void> {
    try {
      await this.auditLogsService.record({
        workspaceId,
        actorType: ActivityActorType.USER,
        actorId: performedBy,
        action,
        actionCategory: AuditActionCategory.CONFIGURATION,
        module: MULTI_CHANNEL_MODULE,
        entityType: 'Channel',
        outcome: ActivityOutcome.SUCCESS,
        metadata,
      });
    } catch (err) {
      this.logger.warn(`Failed to record central audit entry for '${action}': ${(err as Error).message}`);
    }
  }
}
