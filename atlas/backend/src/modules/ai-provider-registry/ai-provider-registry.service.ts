import { Injectable } from '@nestjs/common';
import { ResourceNotFoundException } from '../../common/exceptions/atlas.exception';
import { AiCapability, AiProviderEventType, IAiModelDescriptor } from '../../ai/interfaces';
import { AiProviderEventEmitter } from '../../ai/events/ai-provider-event.emitter';
import { AiProviderRegistry as AiFoundationProviderRegistry } from '../../ai/registry/ai-provider.registry';
import { AiProviderRegistryRepository } from './ai-provider-registry.repository';
import { AiProviderRegistryValidator } from './validator/ai-provider-registry.validator';
import { AiProviderRegistryCache } from './cache/ai-provider-registry.cache';
import { AiProviderRegistryAudit } from './audit/ai-provider-registry.audit';
import { AI_PROVIDER_REGISTRY_CONSTANTS } from './constants';
import { ProviderRegistrationStatus } from './interfaces';
import {
  AiProviderRegistryDuplicateException,
  AiProviderRegistryInvalidTransitionException,
  AiProviderRegistryValidationException,
} from './exceptions/ai-provider-registry.exceptions';
import {
  AiProviderRegistryFilterDto,
  AiProviderRegistryResponseDto,
  CreateAiProviderRegistryDto,
  PaginatedAiProviderRegistryResponseDto,
  RegistrySyncResultResponseDto,
  UpdateAiProviderRegistryDto,
} from './dto';

@Injectable()
export class AiProviderRegistryService {
  constructor(
    private readonly repository: AiProviderRegistryRepository,
    private readonly validator: AiProviderRegistryValidator,
    private readonly cache: AiProviderRegistryCache,
    private readonly audit: AiProviderRegistryAudit,
    private readonly foundationRegistry: AiFoundationProviderRegistry,
    private readonly eventEmitter: AiProviderEventEmitter,
  ) {}

  // ── Register ──────────────────────────────────────────────

  async register(
    workspaceId: string,
    dto: CreateAiProviderRegistryDto,
    userId?: string,
  ): Promise<AiProviderRegistryResponseDto> {
    const validation = this.validator.validate({
      providerKey: dto.providerKey,
      adapterKey: dto.adapterKey,
      displayName: dto.displayName,
      version: dto.version,
      capabilities: dto.capabilities,
      supportedModels: dto.supportedModels ?? [],
      regions: dto.regions,
      priority: dto.priority,
      fallbackOrder: dto.fallbackOrder,
    });
    if (!validation.valid) {
      throw new AiProviderRegistryValidationException(validation.errors);
    }

    const effectiveWorkspaceId = dto.isGlobal ? null : workspaceId;

    const conflict = await this.repository.findConflicting({
      providerKey: dto.providerKey,
      workspaceId: effectiveWorkspaceId,
    });
    if (conflict) {
      throw new AiProviderRegistryDuplicateException(
        this.describeScope(dto.providerKey, effectiveWorkspaceId),
      );
    }

    const raw = await this.repository.create({
      workspaceId: effectiveWorkspaceId,
      providerKey: dto.providerKey,
      adapterKey: dto.adapterKey,
      displayName: dto.displayName,
      version: dto.version,
      status: ProviderRegistrationStatus.PENDING,
      capabilities: dto.capabilities,
      supportedModels: dto.supportedModels ?? [],
      regions: dto.regions ?? [],
      priority: dto.priority ?? 0,
      isDefault: dto.isDefault ?? false,
      fallbackOrder: dto.fallbackOrder ?? [],
      metadata: dto.metadata ?? {},
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    this.audit.logEvent(AiProviderEventType.REGISTRY_ENTRY_CREATED, raw['id'] as string, effectiveWorkspaceId, dto.providerKey, userId);
    this.publishEvent(AiProviderEventType.REGISTRY_ENTRY_CREATED, raw, userId);

    return AiProviderRegistryResponseDto.from(raw);
  }

  // ── Read ──────────────────────────────────────────────────

  async findAll(
    workspaceId: string,
    filter: AiProviderRegistryFilterDto,
  ): Promise<PaginatedAiProviderRegistryResponseDto> {
    const page = filter.page ?? 1;
    const limit = Math.min(
      filter.limit ?? AI_PROVIDER_REGISTRY_CONSTANTS.DEFAULT_PAGE_SIZE,
      AI_PROVIDER_REGISTRY_CONSTANTS.MAX_PAGE_SIZE,
    );
    const [items, total] = await this.repository.findEntries(workspaceId, { ...filter, page, limit });
    return PaginatedAiProviderRegistryResponseDto.from(items, total, page, limit);
  }

  async findById(id: string, workspaceId: string): Promise<AiProviderRegistryResponseDto> {
    const raw = await this.findOrFail(id, workspaceId);
    return AiProviderRegistryResponseDto.from(raw);
  }

  // ── Update ────────────────────────────────────────────────

  async update(
    id: string,
    workspaceId: string,
    dto: UpdateAiProviderRegistryDto,
    userId?: string,
  ): Promise<AiProviderRegistryResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);

    const validation = this.validator.validate({
      providerKey: existing['providerKey'] as string,
      adapterKey: dto.adapterKey ?? (existing['adapterKey'] as string),
      displayName: dto.displayName ?? (existing['displayName'] as string),
      version: dto.version ?? (existing['version'] as string),
      capabilities: dto.capabilities ?? (existing['capabilities'] as AiCapability[]),
      supportedModels: dto.supportedModels ?? (existing['supportedModels'] as IAiModelDescriptor[]) ?? [],
      regions: dto.regions ?? (existing['regions'] as string[] | undefined),
      priority: dto.priority ?? (existing['priority'] as number | undefined),
      fallbackOrder: dto.fallbackOrder ?? (existing['fallbackOrder'] as string[] | undefined),
    });
    if (!validation.valid) {
      throw new AiProviderRegistryValidationException(validation.errors);
    }

    const raw = await this.repository.update(id, {
      adapterKey: dto.adapterKey ?? existing['adapterKey'],
      displayName: dto.displayName ?? existing['displayName'],
      version: dto.version ?? existing['version'],
      capabilities: dto.capabilities ?? existing['capabilities'],
      supportedModels: dto.supportedModels ?? existing['supportedModels'],
      regions: dto.regions ?? existing['regions'],
      priority: dto.priority ?? existing['priority'],
      isDefault: dto.isDefault ?? existing['isDefault'],
      fallbackOrder: dto.fallbackOrder ?? existing['fallbackOrder'],
      metadata: dto.metadata ?? existing['metadata'],
      updatedBy: userId ?? null,
    });

    this.audit.logEvent(AiProviderEventType.REGISTRY_ENTRY_UPDATED, id, raw['workspaceId'] as string | null, raw['providerKey'] as string, userId);
    this.publishEvent(AiProviderEventType.REGISTRY_ENTRY_UPDATED, raw, userId);

    return AiProviderRegistryResponseDto.from(raw);
  }

  // ── Status Transitions ────────────────────────────────────

  async enable(id: string, workspaceId: string, userId?: string): Promise<AiProviderRegistryResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    this.assertTransition(existing, ProviderRegistrationStatus.ACTIVE);

    const raw = await this.repository.update(id, { status: ProviderRegistrationStatus.ACTIVE, updatedBy: userId ?? null });
    this.publishEvent(AiProviderEventType.REGISTRY_ENTRY_ENABLED, raw, userId);
    return AiProviderRegistryResponseDto.from(raw);
  }

  async disable(id: string, workspaceId: string, userId?: string): Promise<AiProviderRegistryResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    this.assertTransition(existing, ProviderRegistrationStatus.DISABLED);

    const raw = await this.repository.update(id, { status: ProviderRegistrationStatus.DISABLED, updatedBy: userId ?? null });
    this.publishEvent(AiProviderEventType.REGISTRY_ENTRY_DISABLED, raw, userId);
    return AiProviderRegistryResponseDto.from(raw);
  }

  async archive(id: string, workspaceId: string, userId?: string): Promise<AiProviderRegistryResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    this.assertTransition(existing, ProviderRegistrationStatus.ARCHIVED);

    const raw = await this.repository.update(id, { status: ProviderRegistrationStatus.ARCHIVED, updatedBy: userId ?? null });
    this.publishEvent(AiProviderEventType.REGISTRY_ENTRY_ARCHIVED, raw, userId);
    return AiProviderRegistryResponseDto.from(raw);
  }

  // ── Synchronization ────────────────────────────────────────

  /**
   * Reconciles GLOBAL registry entries with the AI Provider Foundation's
   * live in-memory registry (`AiProviderRegistry.list()`), which reflects
   * whatever concrete `IAiProvider` implementations have actually been
   * registered at runtime by their own modules. Never touches
   * provider-specific logic — only reads `IAiProviderMetadata`.
   */
  async syncWithFoundation(userId?: string): Promise<RegistrySyncResultResponseDto> {
    const liveProviders = this.foundationRegistry.list();
    const result: RegistrySyncResultResponseDto = { synced: 0, created: 0, updated: 0, unchanged: 0 };

    for (const metadata of liveProviders) {
      const existing = await this.repository.findGlobalByProviderKey(metadata.providerKey);

      if (!existing) {
        const raw = await this.repository.create({
          workspaceId: null,
          providerKey: metadata.providerKey,
          adapterKey: metadata.providerKey,
          displayName: metadata.displayName,
          version: metadata.version,
          status: ProviderRegistrationStatus.ACTIVE,
          capabilities: metadata.capabilities,
          supportedModels: metadata.supportedModels,
          regions: [],
          priority: 0,
          isDefault: false,
          fallbackOrder: [],
          metadata: {},
          lastSyncedAt: new Date(),
          createdBy: userId ?? 'system',
          updatedBy: userId ?? 'system',
        });
        result.created += 1;
        this.publishEvent(AiProviderEventType.REGISTRY_ENTRY_SYNCED, raw, userId, { action: 'created' });
        continue;
      }

      const changed =
        existing['displayName'] !== metadata.displayName ||
        existing['version'] !== metadata.version ||
        JSON.stringify(existing['capabilities']) !== JSON.stringify(metadata.capabilities) ||
        JSON.stringify(existing['supportedModels']) !== JSON.stringify(metadata.supportedModels);

      if (changed) {
        const raw = await this.repository.update(existing['id'] as string, {
          displayName: metadata.displayName,
          version: metadata.version,
          capabilities: metadata.capabilities,
          supportedModels: metadata.supportedModels,
          lastSyncedAt: new Date(),
          updatedBy: userId ?? 'system',
        });
        result.updated += 1;
        this.publishEvent(AiProviderEventType.REGISTRY_ENTRY_SYNCED, raw, userId, { action: 'updated' });
      } else {
        await this.repository.update(existing['id'] as string, { lastSyncedAt: new Date() });
        result.unchanged += 1;
      }
    }

    result.synced = result.created + result.updated + result.unchanged;
    return result;
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
    const raw = await this.repository.findById(id, workspaceId);
    if (!raw) {
      throw new ResourceNotFoundException('AI provider registry entry', id);
    }
    return raw;
  }

  private assertTransition(raw: Record<string, unknown>, to: ProviderRegistrationStatus): void {
    const current = raw['status'] as ProviderRegistrationStatus;
    const allowed = AI_PROVIDER_REGISTRY_CONSTANTS.ALLOWED_TRANSITIONS[current];
    if (!allowed.includes(to)) {
      throw new AiProviderRegistryInvalidTransitionException(current, to);
    }
  }

  private describeScope(providerKey: string, workspaceId: string | null): string {
    return workspaceId ? `provider '${providerKey}' in workspace '${workspaceId}'` : `provider '${providerKey}' (GLOBAL)`;
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
        entryId: raw['id'],
        performedBy: performedBy ?? 'system',
        ...metadata,
      },
    });
  }
}
