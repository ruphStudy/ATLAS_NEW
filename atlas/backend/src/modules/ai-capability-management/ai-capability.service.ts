import { Injectable } from '@nestjs/common';
import { ResourceNotFoundException } from '../../common/exceptions/atlas.exception';
import { AiCapability, AiProviderEventType } from '../../ai/interfaces';
import { AiProviderEventEmitter } from '../../ai/events/ai-provider-event.emitter';
import { AiCapabilityRepository } from './ai-capability.repository';
import { AiCapabilityValidator } from './validator/ai-capability.validator';
import { AiCapabilityCache } from './cache/ai-capability.cache';
import { AiCapabilityAudit } from './audit/ai-capability.audit';
import { AI_CAPABILITY_CONSTANTS } from './constants';
import {
  CapabilityDefinitionStatus,
  CapabilityOverrideScope,
  CapabilityOverrideStatus,
  IAiCapabilityLimits,
} from './interfaces';
import {
  AiCapabilityDuplicateException,
  AiCapabilityInvalidTransitionException,
  AiCapabilityOverrideDuplicateException,
  AiCapabilityValidationException,
} from './exceptions/ai-capability.exceptions';
import {
  AiCapabilityDefinitionFilterDto,
  AiCapabilityDefinitionResponseDto,
  AiCapabilityOverrideFilterDto,
  AiCapabilityOverrideResponseDto,
  CreateAiCapabilityDefinitionDto,
  CreateAiCapabilityOverrideDto,
  CreateAiCapabilityVersionDto,
  PaginatedAiCapabilityDefinitionResponseDto,
  PaginatedAiCapabilityOverrideResponseDto,
  UpdateAiCapabilityDefinitionDto,
  UpdateAiCapabilityOverrideDto,
} from './dto';

@Injectable()
export class AiCapabilityService {
  constructor(
    private readonly repository: AiCapabilityRepository,
    private readonly validator: AiCapabilityValidator,
    private readonly cache: AiCapabilityCache,
    private readonly audit: AiCapabilityAudit,
    private readonly eventEmitter: AiProviderEventEmitter,
  ) {}

  // ── Definitions ───────────────────────────────────────────

  async defineCapability(
    dto: CreateAiCapabilityDefinitionDto,
    userId?: string,
  ): Promise<AiCapabilityDefinitionResponseDto> {
    const validation = this.validator.validateDefinition({
      capabilityKey: dto.capabilityKey,
      version: dto.version,
      displayName: dto.displayName,
      limits: dto.limits,
      dependencies: dto.dependencies,
      requiredRoles: dto.requiredRoles,
    });
    if (!validation.valid) {
      throw new AiCapabilityValidationException(validation.errors);
    }

    const conflict = await this.repository.findConflictingDefinition(dto.capabilityKey, dto.version);
    if (conflict) {
      throw new AiCapabilityDuplicateException(dto.capabilityKey, dto.version);
    }

    const raw = await this.repository.createDefinition({
      capabilityKey: dto.capabilityKey,
      version: dto.version,
      status: CapabilityDefinitionStatus.DRAFT,
      displayName: dto.displayName,
      description: dto.description ?? null,
      inputSchema: dto.inputSchema ?? null,
      outputSchema: dto.outputSchema ?? null,
      limits: dto.limits ?? {},
      dependencies: dto.dependencies ?? [],
      requiredRoles: dto.requiredRoles ?? [],
      metadata: dto.metadata ?? {},
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    this.publishEvent(AiProviderEventType.CAPABILITY_DEFINED, dto.capabilityKey, undefined, userId);
    this.audit.logEvent(AiProviderEventType.CAPABILITY_DEFINED, dto.capabilityKey, undefined, userId);

    return AiCapabilityDefinitionResponseDto.from(raw);
  }

  async findAllDefinitions(filter: AiCapabilityDefinitionFilterDto): Promise<PaginatedAiCapabilityDefinitionResponseDto> {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? AI_CAPABILITY_CONSTANTS.DEFAULT_PAGE_SIZE, AI_CAPABILITY_CONSTANTS.MAX_PAGE_SIZE);
    const [items, total] = await this.repository.findDefinitions({ ...filter, page, limit });
    return PaginatedAiCapabilityDefinitionResponseDto.from(items, total, page, limit);
  }

  async findDefinitionById(id: string): Promise<AiCapabilityDefinitionResponseDto> {
    const raw = await this.findDefinitionOrFail(id);
    return AiCapabilityDefinitionResponseDto.from(raw);
  }

  async updateDefinition(
    id: string,
    dto: UpdateAiCapabilityDefinitionDto,
    userId?: string,
  ): Promise<AiCapabilityDefinitionResponseDto> {
    const existing = await this.findDefinitionOrFail(id);

    const validation = this.validator.validateDefinition({
      capabilityKey: existing['capabilityKey'] as AiCapability,
      version: existing['version'] as string,
      displayName: dto.displayName ?? (existing['displayName'] as string),
      limits: dto.limits ?? (existing['limits'] as IAiCapabilityLimits),
      dependencies: dto.dependencies ?? (existing['dependencies'] as AiCapability[]),
      requiredRoles: dto.requiredRoles ?? (existing['requiredRoles'] as string[] | undefined),
    });
    if (!validation.valid) {
      throw new AiCapabilityValidationException(validation.errors);
    }

    const raw = await this.repository.updateDefinition(id, {
      displayName: dto.displayName ?? existing['displayName'],
      description: dto.description ?? existing['description'],
      inputSchema: dto.inputSchema ?? existing['inputSchema'],
      outputSchema: dto.outputSchema ?? existing['outputSchema'],
      limits: dto.limits ?? existing['limits'],
      dependencies: dto.dependencies ?? existing['dependencies'],
      requiredRoles: dto.requiredRoles ?? existing['requiredRoles'],
      metadata: dto.metadata ?? existing['metadata'],
      updatedBy: userId ?? null,
    });

    const capabilityKey = raw['capabilityKey'] as string;
    this.publishEvent(AiProviderEventType.CAPABILITY_UPDATED, capabilityKey, undefined, userId);
    this.audit.logEvent(AiProviderEventType.CAPABILITY_UPDATED, capabilityKey, undefined, userId);

    return AiCapabilityDefinitionResponseDto.from(raw);
  }

  async enableDefinition(id: string, userId?: string): Promise<AiCapabilityDefinitionResponseDto> {
    const existing = await this.findDefinitionOrFail(id);
    this.assertTransition(existing, CapabilityDefinitionStatus.ACTIVE);

    const raw = await this.repository.updateDefinition(id, {
      status: CapabilityDefinitionStatus.ACTIVE,
      updatedBy: userId ?? null,
    });

    const capabilityKey = raw['capabilityKey'] as string;
    this.publishEvent(AiProviderEventType.CAPABILITY_ENABLED, capabilityKey, undefined, userId);
    return AiCapabilityDefinitionResponseDto.from(raw);
  }

  async disableDefinition(id: string, userId?: string): Promise<AiCapabilityDefinitionResponseDto> {
    const existing = await this.findDefinitionOrFail(id);
    this.assertTransition(existing, CapabilityDefinitionStatus.DISABLED);

    const raw = await this.repository.updateDefinition(id, {
      status: CapabilityDefinitionStatus.DISABLED,
      updatedBy: userId ?? null,
    });

    const capabilityKey = raw['capabilityKey'] as string;
    this.publishEvent(AiProviderEventType.CAPABILITY_DISABLED, capabilityKey, undefined, userId);
    return AiCapabilityDefinitionResponseDto.from(raw);
  }

  async createVersion(
    id: string,
    dto: CreateAiCapabilityVersionDto,
    userId?: string,
  ): Promise<AiCapabilityDefinitionResponseDto> {
    const existing = await this.findDefinitionOrFail(id);
    const capabilityKey = existing['capabilityKey'] as string;

    const conflict = await this.repository.findConflictingDefinition(capabilityKey, dto.version);
    if (conflict) {
      throw new AiCapabilityDuplicateException(capabilityKey, dto.version);
    }

    const validation = this.validator.validateDefinition({
      capabilityKey: capabilityKey as AiCapability,
      version: dto.version,
      displayName: dto.displayName ?? (existing['displayName'] as string),
      limits: dto.limits ?? (existing['limits'] as IAiCapabilityLimits),
      dependencies: dto.dependencies ?? (existing['dependencies'] as AiCapability[]),
      requiredRoles: dto.requiredRoles ?? (existing['requiredRoles'] as string[] | undefined),
    });
    if (!validation.valid) {
      throw new AiCapabilityValidationException(validation.errors);
    }

    const raw = await this.repository.createDefinition({
      capabilityKey,
      version: dto.version,
      status: CapabilityDefinitionStatus.DRAFT,
      displayName: dto.displayName ?? existing['displayName'],
      description: dto.description ?? existing['description'],
      inputSchema: dto.inputSchema ?? existing['inputSchema'],
      outputSchema: dto.outputSchema ?? existing['outputSchema'],
      limits: dto.limits ?? existing['limits'],
      dependencies: dto.dependencies ?? existing['dependencies'],
      requiredRoles: dto.requiredRoles ?? existing['requiredRoles'],
      metadata: dto.metadata ?? existing['metadata'],
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    if (existing['status'] === CapabilityDefinitionStatus.ACTIVE) {
      await this.repository.updateDefinition(id, {
        status: CapabilityDefinitionStatus.DEPRECATED,
        updatedBy: userId ?? null,
      });
    }

    this.publishEvent(AiProviderEventType.CAPABILITY_VERSIONED, capabilityKey, undefined, userId, {
      previousVersion: existing['version'],
      newVersion: dto.version,
    });
    this.audit.logEvent(AiProviderEventType.CAPABILITY_VERSIONED, capabilityKey, undefined, userId);

    return AiCapabilityDefinitionResponseDto.from(raw);
  }

  // ── Overrides ─────────────────────────────────────────────

  async registerOverride(
    workspaceId: string,
    dto: CreateAiCapabilityOverrideDto,
    userId?: string,
  ): Promise<AiCapabilityOverrideResponseDto> {
    const effectiveWorkspaceId = dto.scope === CapabilityOverrideScope.WORKSPACE ? workspaceId : null;

    const validation = this.validator.validateOverride({
      scope: dto.scope,
      capabilityKey: dto.capabilityKey,
      workspaceId: effectiveWorkspaceId ?? undefined,
      providerKey: dto.providerKey,
      modelId: dto.modelId,
      priority: dto.priority,
    });
    if (!validation.valid) {
      throw new AiCapabilityValidationException(validation.errors);
    }

    const conflict = await this.repository.findConflictingOverride({
      scope: dto.scope,
      capabilityKey: dto.capabilityKey,
      workspaceId: effectiveWorkspaceId,
      providerKey: dto.providerKey,
      modelId: dto.modelId,
    });
    if (conflict) {
      throw new AiCapabilityOverrideDuplicateException(this.describeOverrideScope(dto, effectiveWorkspaceId));
    }

    const raw = await this.repository.createOverride({
      scope: dto.scope,
      capabilityKey: dto.capabilityKey,
      workspaceId: effectiveWorkspaceId,
      providerKey: dto.providerKey ?? null,
      modelId: dto.modelId ?? null,
      supportLevel: dto.supportLevel,
      status: CapabilityOverrideStatus.ACTIVE,
      featureFlag: dto.featureFlag ?? null,
      schemaOverride: dto.schemaOverride ?? null,
      limitsOverride: dto.limitsOverride ?? null,
      priority: dto.priority ?? 0,
      metadata: dto.metadata ?? {},
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    this.publishEvent(AiProviderEventType.CAPABILITY_OVERRIDE_REGISTERED, dto.capabilityKey, effectiveWorkspaceId ?? undefined, userId, {
      scope: dto.scope,
      providerKey: dto.providerKey,
    });

    return AiCapabilityOverrideResponseDto.from(raw);
  }

  async findAllOverrides(filter: AiCapabilityOverrideFilterDto): Promise<PaginatedAiCapabilityOverrideResponseDto> {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? AI_CAPABILITY_CONSTANTS.DEFAULT_PAGE_SIZE, AI_CAPABILITY_CONSTANTS.MAX_PAGE_SIZE);
    const [items, total] = await this.repository.findOverrides({ ...filter, page, limit });
    return PaginatedAiCapabilityOverrideResponseDto.from(items, total, page, limit);
  }

  async findOverrideById(id: string): Promise<AiCapabilityOverrideResponseDto> {
    const raw = await this.findOverrideOrFail(id);
    return AiCapabilityOverrideResponseDto.from(raw);
  }

  async updateOverride(
    id: string,
    dto: UpdateAiCapabilityOverrideDto,
    userId?: string,
  ): Promise<AiCapabilityOverrideResponseDto> {
    const existing = await this.findOverrideOrFail(id);

    const raw = await this.repository.updateOverride(id, {
      supportLevel: dto.supportLevel ?? existing['supportLevel'],
      featureFlag: dto.featureFlag ?? existing['featureFlag'],
      schemaOverride: dto.schemaOverride ?? existing['schemaOverride'],
      limitsOverride: dto.limitsOverride ?? existing['limitsOverride'],
      priority: dto.priority ?? existing['priority'],
      metadata: dto.metadata ?? existing['metadata'],
      updatedBy: userId ?? null,
    });

    const capabilityKey = raw['capabilityKey'] as string;
    this.publishEvent(AiProviderEventType.CAPABILITY_OVERRIDE_UPDATED, capabilityKey, raw['workspaceId'] as string | undefined, userId, {
      scope: raw['scope'],
    });

    return AiCapabilityOverrideResponseDto.from(raw);
  }

  async disableOverride(id: string, userId?: string): Promise<AiCapabilityOverrideResponseDto> {
    const existing = await this.findOverrideOrFail(id);
    const raw = await this.repository.updateOverride(id, {
      status: CapabilityOverrideStatus.DISABLED,
      updatedBy: userId ?? null,
    });

    const capabilityKey = raw['capabilityKey'] as string;
    this.publishEvent(AiProviderEventType.CAPABILITY_OVERRIDE_DISABLED, capabilityKey, existing['workspaceId'] as string | undefined, userId);
    return AiCapabilityOverrideResponseDto.from(raw);
  }

  async enableOverride(id: string, userId?: string): Promise<AiCapabilityOverrideResponseDto> {
    await this.findOverrideOrFail(id);
    const raw = await this.repository.updateOverride(id, {
      status: CapabilityOverrideStatus.ACTIVE,
      updatedBy: userId ?? null,
    });
    return AiCapabilityOverrideResponseDto.from(raw);
  }

  // ── Cache ─────────────────────────────────────────────────

  invalidateCache(capabilityKey?: string): void {
    if (capabilityKey) {
      this.cache.invalidateDefinition(capabilityKey);
      this.cache.invalidateResolutionsByCapability(capabilityKey);
    } else {
      this.cache.flush();
    }
  }

  // ── Helpers ───────────────────────────────────────────────

  private async findDefinitionOrFail(id: string): Promise<Record<string, unknown>> {
    const raw = await this.repository.findDefinitionById(id);
    if (!raw) {
      throw new ResourceNotFoundException('AI capability definition', id);
    }
    return raw;
  }

  private async findOverrideOrFail(id: string): Promise<Record<string, unknown>> {
    const raw = await this.repository.findOverrideById(id);
    if (!raw) {
      throw new ResourceNotFoundException('AI capability override', id);
    }
    return raw;
  }

  private assertTransition(raw: Record<string, unknown>, to: CapabilityDefinitionStatus): void {
    const current = raw['status'] as CapabilityDefinitionStatus;
    const allowed = AI_CAPABILITY_CONSTANTS.ALLOWED_TRANSITIONS[current];
    if (!allowed.includes(to)) {
      throw new AiCapabilityInvalidTransitionException(current, to);
    }
  }

  private describeOverrideScope(dto: CreateAiCapabilityOverrideDto, workspaceId: string | null): string {
    const parts = [`capability '${dto.capabilityKey}'`, `scope '${dto.scope}'`];
    if (workspaceId) parts.push(`workspace '${workspaceId}'`);
    if (dto.providerKey) parts.push(`provider '${dto.providerKey}'`);
    if (dto.modelId) parts.push(`model '${dto.modelId}'`);
    return parts.join(', ');
  }

  private publishEvent(
    type: AiProviderEventType,
    capabilityKey: string,
    workspaceId?: string,
    performedBy?: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.eventEmitter.emit({
      type,
      providerKey: capabilityKey,
      workspaceId,
      occurredAt: new Date(),
      payload: { capabilityKey, performedBy: performedBy ?? 'system', ...metadata },
    });
  }
}
