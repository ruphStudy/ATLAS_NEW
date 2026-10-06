import { Injectable } from '@nestjs/common';
import { ResourceNotFoundException } from '../../common/exceptions/atlas.exception';
import { AiProviderEventType } from '../../ai/interfaces';
import { AiProviderEventEmitter } from '../../ai/events/ai-provider-event.emitter';
import { AiProviderConfigurationRepository } from './ai-provider-configuration.repository';
import { AiProviderConfigValidator } from './validator/ai-provider-configuration.validator';
import { AiProviderConfigCache } from './cache/ai-provider-configuration.cache';
import { AiProviderConfigAudit } from './audit/ai-provider-configuration.audit';
import { AI_CONFIG_CONSTANTS } from './constants';
import { AiConfigScope, AiConfigStatus, IAiProviderConfigEntity, IAiProviderConfigPayload } from './interfaces';
import {
  AiProviderConfigDuplicateException,
  AiProviderConfigHistoryVersionNotFoundException,
  AiProviderConfigImmutableException,
  AiProviderConfigInvalidTransitionException,
  AiProviderConfigValidationException,
} from './exceptions/ai-provider-configuration.exceptions';
import {
  AiProviderConfigFilterDto,
  AiProviderConfigHistoryResponseDto,
  AiProviderConfigResponseDto,
  CloneAiProviderConfigDto,
  CreateAiProviderConfigDto,
  PaginatedAiProviderConfigResponseDto,
  PublishAiProviderConfigDto,
  RollbackAiProviderConfigDto,
  UpdateAiProviderConfigDto,
} from './dto';

@Injectable()
export class AiProviderConfigurationService {
  constructor(
    private readonly repository: AiProviderConfigurationRepository,
    private readonly validator: AiProviderConfigValidator,
    private readonly cache: AiProviderConfigCache,
    private readonly audit: AiProviderConfigAudit,
    private readonly eventEmitter: AiProviderEventEmitter,
  ) {}

  // ── Create ────────────────────────────────────────────────

  async createConfig(
    workspaceId: string,
    dto: CreateAiProviderConfigDto,
    userId?: string,
  ): Promise<AiProviderConfigResponseDto> {
    const payload = (dto.payload ?? {}) as IAiProviderConfigPayload;
    const effectiveWorkspaceId = dto.scope === AiConfigScope.GLOBAL ? null : workspaceId;

    const validation = this.validator.validate(payload, {
      scope: dto.scope,
      providerKey: dto.providerKey,
      useCase: dto.useCase,
      modelId: dto.modelId,
    });
    if (!validation.valid) {
      throw new AiProviderConfigValidationException(validation.errors);
    }

    const conflict = await this.repository.findConflicting({
      providerKey: dto.providerKey,
      scope: dto.scope,
      workspaceId: effectiveWorkspaceId,
      useCase: dto.useCase,
      modelId: dto.modelId,
    });
    if (conflict) {
      throw new AiProviderConfigDuplicateException(
        this.describeScope(dto.scope, dto.providerKey, effectiveWorkspaceId, dto.useCase, dto.modelId),
      );
    }

    const version = await this.repository.getNextVersion({
      providerKey: dto.providerKey,
      scope: dto.scope,
      workspaceId: effectiveWorkspaceId,
      useCase: dto.useCase,
      modelId: dto.modelId,
    });

    const raw = await this.repository.createConfig({
      workspaceId: effectiveWorkspaceId,
      scope: dto.scope,
      providerKey: dto.providerKey,
      useCase: dto.useCase ?? null,
      modelId: dto.modelId ?? null,
      name: dto.name,
      description: dto.description ?? null,
      status: AiConfigStatus.DRAFT,
      priority: dto.priority ?? 0,
      version,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      payload,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    await this.audit.logChange(this.toEntity(raw), 'Created', userId);
    this.publishEvent(AiProviderEventType.CONFIG_CREATED, raw, userId);

    return AiProviderConfigResponseDto.from(raw);
  }

  // ── Read ──────────────────────────────────────────────────

  async findAll(
    workspaceId: string,
    filter: AiProviderConfigFilterDto,
  ): Promise<PaginatedAiProviderConfigResponseDto> {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? AI_CONFIG_CONSTANTS.DEFAULT_PAGE_SIZE, AI_CONFIG_CONSTANTS.MAX_PAGE_SIZE);
    const [items, total] = await this.repository.findConfigs(workspaceId, { ...filter, page, limit });
    return PaginatedAiProviderConfigResponseDto.from(items, total, page, limit);
  }

  async findById(id: string, workspaceId: string): Promise<AiProviderConfigResponseDto> {
    const raw = await this.findOrFail(id, workspaceId);
    return AiProviderConfigResponseDto.from(raw);
  }

  // ── Update ────────────────────────────────────────────────

  async updateConfig(
    id: string,
    workspaceId: string,
    dto: UpdateAiProviderConfigDto,
    userId?: string,
  ): Promise<AiProviderConfigResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    this.assertMutable(existing);

    const mergedPayload: IAiProviderConfigPayload = {
      ...(existing['payload'] as IAiProviderConfigPayload),
      ...(dto.payload as Partial<IAiProviderConfigPayload>),
    };

    const validation = this.validator.validate(mergedPayload, {
      scope: existing['scope'] as AiConfigScope,
      providerKey: existing['providerKey'] as string,
      useCase: (existing['useCase'] as string) ?? undefined,
      modelId: (existing['modelId'] as string) ?? undefined,
    });
    if (!validation.valid) {
      throw new AiProviderConfigValidationException(validation.errors);
    }

    const version = (existing['version'] as number) + 1;
    const raw = await this.repository.updateConfig(id, {
      name: dto.name ?? existing['name'],
      description: dto.description ?? existing['description'],
      priority: dto.priority ?? existing['priority'],
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : existing['effectiveFrom'],
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : existing['effectiveTo'],
      payload: mergedPayload,
      version,
      updatedBy: userId ?? null,
    });

    await this.audit.logChange(this.toEntity(raw), 'Updated', userId);
    this.publishEvent(AiProviderEventType.CONFIG_UPDATED, raw, userId);

    return AiProviderConfigResponseDto.from(raw);
  }

  // ── Status Transitions ────────────────────────────────────

  async publishConfig(
    id: string,
    workspaceId: string,
    dto: PublishAiProviderConfigDto,
    userId?: string,
  ): Promise<AiProviderConfigResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    this.assertTransition(existing, AiConfigStatus.PUBLISHED);

    const raw = await this.repository.updateConfig(id, {
      status: AiConfigStatus.PUBLISHED,
      publishedVersion: existing['version'],
      approvedBy: dto.approvedBy ?? userId ?? null,
      updatedBy: userId ?? null,
    });

    await this.audit.logChange(this.toEntity(raw), dto.changeReason ?? 'Published', userId);
    this.publishEvent(AiProviderEventType.CONFIG_PUBLISHED, raw, userId);

    return AiProviderConfigResponseDto.from(raw);
  }

  async enableConfig(id: string, workspaceId: string, userId?: string): Promise<AiProviderConfigResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    this.assertTransition(existing, AiConfigStatus.PUBLISHED);

    const raw = await this.repository.updateConfig(id, {
      status: AiConfigStatus.PUBLISHED,
      updatedBy: userId ?? null,
    });

    this.publishEvent(AiProviderEventType.CONFIG_ENABLED, raw, userId);
    return AiProviderConfigResponseDto.from(raw);
  }

  async disableConfig(id: string, workspaceId: string, userId?: string): Promise<AiProviderConfigResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    this.assertTransition(existing, AiConfigStatus.DISABLED);

    const raw = await this.repository.updateConfig(id, {
      status: AiConfigStatus.DISABLED,
      updatedBy: userId ?? null,
    });

    this.publishEvent(AiProviderEventType.CONFIG_DISABLED, raw, userId);
    return AiProviderConfigResponseDto.from(raw);
  }

  async archiveConfig(id: string, workspaceId: string, userId?: string): Promise<void> {
    const existing = await this.findOrFail(id, workspaceId);
    this.assertTransition(existing, AiConfigStatus.ARCHIVED);

    const raw = await this.repository.updateConfig(id, {
      status: AiConfigStatus.ARCHIVED,
      updatedBy: userId ?? null,
    });

    this.publishEvent(AiProviderEventType.CONFIG_ARCHIVED, raw, userId);
  }

  async deleteConfig(id: string, workspaceId: string): Promise<void> {
    const existing = await this.findOrFail(id, workspaceId);
    await this.repository.softDeleteConfig(id);
    this.publishEvent(AiProviderEventType.CONFIG_DELETED, existing);
  }

  // ── Versioning / Rollback ─────────────────────────────────

  async rollback(
    id: string,
    workspaceId: string,
    dto: RollbackAiProviderConfigDto,
    userId?: string,
  ): Promise<AiProviderConfigResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const historyEntry = await this.repository.findHistoryByVersion(id, dto.toVersion);
    if (!historyEntry) {
      throw new AiProviderConfigHistoryVersionNotFoundException(id, dto.toVersion);
    }

    const newVersion = (existing['version'] as number) + 1;
    const raw = await this.repository.updateConfig(id, {
      payload: historyEntry['payload'],
      version: newVersion,
      status: AiConfigStatus.DRAFT,
      updatedBy: userId ?? null,
    });

    await this.audit.logChange(this.toEntity(raw), dto.reason ?? `Rolled back to v${dto.toVersion}`, userId);
    this.publishEvent(AiProviderEventType.CONFIG_ROLLED_BACK, raw, userId, { rolledBackToVersion: dto.toVersion });

    return AiProviderConfigResponseDto.from(raw);
  }

  async getHistory(id: string, workspaceId: string): Promise<AiProviderConfigHistoryResponseDto[]> {
    await this.findOrFail(id, workspaceId);
    const entries = await this.repository.findHistory(id);
    return entries.map((e) => AiProviderConfigHistoryResponseDto.from(e));
  }

  // ── Clone ─────────────────────────────────────────────────

  async cloneConfig(
    id: string,
    workspaceId: string,
    dto: CloneAiProviderConfigDto,
    userId?: string,
  ): Promise<AiProviderConfigResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const scope = existing['scope'] as AiConfigScope;
    const useCase = (existing['useCase'] as string) ?? undefined;
    const modelId = (existing['modelId'] as string) ?? undefined;
    const targetWorkspaceId =
      scope === AiConfigScope.GLOBAL ? null : dto.targetWorkspaceId ?? (existing['workspaceId'] as string) ?? workspaceId;

    const conflict = await this.repository.findConflicting({
      providerKey: existing['providerKey'] as string,
      scope,
      workspaceId: targetWorkspaceId,
      useCase,
      modelId,
    });
    if (conflict) {
      throw new AiProviderConfigDuplicateException(
        this.describeScope(scope, existing['providerKey'] as string, targetWorkspaceId, useCase, modelId),
      );
    }

    const version = await this.repository.getNextVersion({
      providerKey: existing['providerKey'] as string,
      scope,
      workspaceId: targetWorkspaceId,
      useCase,
      modelId,
    });

    const raw = await this.repository.createConfig({
      workspaceId: targetWorkspaceId,
      scope,
      providerKey: existing['providerKey'],
      useCase: useCase ?? null,
      modelId: modelId ?? null,
      name: dto.name,
      description: dto.description ?? existing['description'],
      status: AiConfigStatus.DRAFT,
      priority: existing['priority'],
      version,
      payload: existing['payload'],
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    await this.audit.logChange(this.toEntity(raw), `Cloned from ${id}`, userId);
    this.publishEvent(AiProviderEventType.CONFIG_CLONED, raw, userId, { clonedFromId: id });

    return AiProviderConfigResponseDto.from(raw);
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
    if (!raw) {
      throw new ResourceNotFoundException('AI provider configuration', id);
    }
    return raw;
  }

  private assertMutable(raw: Record<string, unknown>): void {
    const status = raw['status'] as AiConfigStatus;
    if (status === AiConfigStatus.ARCHIVED) {
      throw new AiProviderConfigImmutableException(status);
    }
  }

  private assertTransition(raw: Record<string, unknown>, to: AiConfigStatus): void {
    const current = raw['status'] as AiConfigStatus;
    const allowed = AI_CONFIG_CONSTANTS.ALLOWED_TRANSITIONS[current];
    if (!allowed.includes(to)) {
      throw new AiProviderConfigInvalidTransitionException(current, to);
    }
  }

  private toEntity(raw: Record<string, unknown>): IAiProviderConfigEntity {
    return raw as unknown as IAiProviderConfigEntity;
  }

  private describeScope(
    scope: AiConfigScope,
    providerKey: string,
    workspaceId?: string | null,
    useCase?: string,
    modelId?: string,
  ): string {
    const parts = [`provider '${providerKey}'`, `scope '${scope}'`, `workspace '${workspaceId ?? 'GLOBAL'}'`];
    if (useCase) parts.push(`use case '${useCase}'`);
    if (modelId) parts.push(`model '${modelId}'`);
    return parts.join(', ');
  }

  private publishEvent(
    type: AiProviderEventType,
    raw: Record<string, unknown>,
    performedBy?: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.eventEmitter.emit({
      type,
      providerKey: raw['providerKey'] as string,
      workspaceId: (raw['workspaceId'] as string) ?? undefined,
      occurredAt: new Date(),
      payload: {
        configId: raw['id'],
        version: raw['version'],
        performedBy: performedBy ?? 'system',
        ...metadata,
      },
    });
  }
}
