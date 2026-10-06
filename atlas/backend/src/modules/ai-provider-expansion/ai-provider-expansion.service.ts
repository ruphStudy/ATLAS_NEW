import { Injectable } from '@nestjs/common';
import { AiCapability, AiProviderEventType, IAiProviderHealth } from '../../ai/interfaces';
import { AiProviderEventEmitter } from '../../ai/events/ai-provider-event.emitter';
import { AiProviderRegistry } from '../../ai/registry/ai-provider.registry';
import { AiProviderHealthService } from '../../ai/health/ai-provider-health.service';
import { AiProviderExpansionRepository } from './ai-provider-expansion.repository';
import { AiProviderExpansionCache } from './cache/ai-provider-expansion.cache';
import { AiProviderExpansionValidator } from './validator/ai-provider-expansion.validator';
import { AiProviderExpansionAudit } from './audit/ai-provider-expansion.audit';
import {
  AdapterCompatibilityStatus,
  AiProviderRolloutState,
  IAiProviderExpansion,
  IAiProviderExpansionFilterOptions,
  IEligibilityResult,
} from './interfaces';
import { AI_PROVIDER_EXPANSION_CONSTANTS } from './constants';
import {
  AiProviderExpansionAdapterIncompatibleException,
  AiProviderExpansionDuplicateException,
  AiProviderExpansionInvalidTransitionException,
  AiProviderExpansionNotFoundException,
  AiProviderExpansionValidationException,
} from './exceptions/ai-provider-expansion.exceptions';
import {
  AiProviderExpansionFilterDto,
  AiProviderExpansionHistoryResponseDto,
  AiProviderExpansionResponseDto,
  CheckEligibilityDto,
  OnboardAiProviderDto,
  PaginatedAiProviderExpansionResponseDto,
  PromoteRolloutDto,
  UpdateAiProviderExpansionDto,
} from './dto';

const ROLLOUT_ORDER: AiProviderRolloutState[] = [
  AiProviderRolloutState.DRAFT,
  AiProviderRolloutState.BETA,
  AiProviderRolloutState.ACTIVE,
  AiProviderRolloutState.DEPRECATED,
  AiProviderRolloutState.DISABLED,
];

@Injectable()
export class AiProviderExpansionService {
  constructor(
    private readonly repository: AiProviderExpansionRepository,
    private readonly cache: AiProviderExpansionCache,
    private readonly validator: AiProviderExpansionValidator,
    private readonly audit: AiProviderExpansionAudit,
    private readonly eventEmitter: AiProviderEventEmitter,
    private readonly registry: AiProviderRegistry,
    private readonly healthService: AiProviderHealthService,
  ) {}

  // ── Onboarding ──────────────────────────────────────────────

  async onboardProvider(workspaceId: string, dto: OnboardAiProviderDto, userId?: string): Promise<AiProviderExpansionResponseDto> {
    const effectiveWorkspaceId = dto.isGlobal ? null : workspaceId;

    const existing = await this.repository.findByProviderKey(dto.providerKey, effectiveWorkspaceId);
    if (existing) {
      throw new AiProviderExpansionDuplicateException(this.describeScope(dto.providerKey, effectiveWorkspaceId));
    }

    const validation = this.validator.validate({
      providerKey: dto.providerKey,
      eligibleWorkspaceIds: dto.eligibleWorkspaceIds,
    });
    if (!validation.valid) {
      throw new AiProviderExpansionValidationException(validation.errors);
    }

    const raw = await this.repository.create({
      providerKey: dto.providerKey,
      workspaceId: effectiveWorkspaceId,
      organizationId: dto.organizationId ?? null,
      rolloutState: AiProviderRolloutState.DRAFT,
      version: 1,
      apiVersionLabel: dto.apiVersionLabel ?? null,
      backwardCompatibleApiVersions: dto.backwardCompatibleApiVersions ?? [],
      eligibilityScope: dto.eligibilityScope ?? 'ALL',
      eligibleWorkspaceIds: dto.eligibleWorkspaceIds ?? [],
      adapterCompatibilityStatus: AdapterCompatibilityStatus.UNVALIDATED,
      compatibilityIssues: [],
      featureFlags: dto.featureFlags ?? {},
      onboardedAt: new Date(),
      settings: dto.settings ?? {},
      metadata: dto.metadata ?? {},
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    const expansion = raw as unknown as IAiProviderExpansion;
    await this.audit.logExpansionChange(expansion, 'Onboarded', userId);
    this.cache.invalidate(expansion.providerKey, expansion.workspaceId);
    this.publishEvent(AiProviderEventType.EXPANSION_ONBOARDED, expansion, userId);

    return AiProviderExpansionResponseDto.from(raw);
  }

  // ── Read ──────────────────────────────────────────────────

  async findAll(workspaceId: string, filter: AiProviderExpansionFilterDto): Promise<PaginatedAiProviderExpansionResponseDto> {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? AI_PROVIDER_EXPANSION_CONSTANTS.DEFAULT_PAGE_SIZE, AI_PROVIDER_EXPANSION_CONSTANTS.MAX_PAGE_SIZE);
    const [items, total] = await this.repository.findEntries(workspaceId, filter as IAiProviderExpansionFilterOptions);
    return PaginatedAiProviderExpansionResponseDto.from(items, total, page, limit);
  }

  async findById(id: string, workspaceId: string): Promise<AiProviderExpansionResponseDto> {
    const raw = await this.requireExpansion(id, workspaceId);
    return AiProviderExpansionResponseDto.from(raw);
  }

  /** Prefers a workspace-scoped override over the platform-wide expansion for the same provider — cached, event-invalidated. */
  async resolveExpansion(providerKey: string, workspaceId: string): Promise<AiProviderExpansionResponseDto | null> {
    const cached = this.cache.get(providerKey, workspaceId);
    if (cached) return AiProviderExpansionResponseDto.from(cached as unknown as Record<string, unknown>);

    const raw = await this.repository.resolve(providerKey, workspaceId);
    if (!raw) return null;
    const expansion = raw as unknown as IAiProviderExpansion;
    this.cache.set(expansion);
    return AiProviderExpansionResponseDto.from(raw);
  }

  // ── Update ────────────────────────────────────────────────

  /**
   * Mutates in place while the expansion is still DRAFT. Once
   * BETA/ACTIVE/DEPRECATED/DISABLED, an update instead creates a new
   * version — the live row is never touched.
   */
  async updateExpansion(id: string, workspaceId: string, dto: UpdateAiProviderExpansionDto, userId?: string): Promise<AiProviderExpansionResponseDto> {
    const existing = (await this.requireExpansion(id, workspaceId)) as unknown as IAiProviderExpansion;

    const validation = this.validator.validate({
      providerKey: existing.providerKey,
      eligibleWorkspaceIds: dto.eligibleWorkspaceIds ?? existing.eligibleWorkspaceIds,
    });
    if (!validation.valid) {
      throw new AiProviderExpansionValidationException(validation.errors);
    }

    if (existing.rolloutState === AiProviderRolloutState.DRAFT) {
      const raw = await this.repository.update(id, {
        ...(dto.apiVersionLabel !== undefined && { apiVersionLabel: dto.apiVersionLabel }),
        ...(dto.backwardCompatibleApiVersions !== undefined && { backwardCompatibleApiVersions: dto.backwardCompatibleApiVersions }),
        ...(dto.eligibilityScope !== undefined && { eligibilityScope: dto.eligibilityScope }),
        ...(dto.eligibleWorkspaceIds !== undefined && { eligibleWorkspaceIds: dto.eligibleWorkspaceIds }),
        ...(dto.featureFlags !== undefined && { featureFlags: dto.featureFlags }),
        ...(dto.settings !== undefined && { settings: dto.settings }),
        ...(dto.metadata !== undefined && { metadata: dto.metadata }),
        updatedBy: userId ?? null,
      });

      const expansion = raw as unknown as IAiProviderExpansion;
      this.cache.invalidate(expansion.providerKey, expansion.workspaceId);
      await this.audit.logExpansionChange(expansion, dto.changeReason ?? 'Updated', userId);
      this.publishEvent(AiProviderEventType.EXPANSION_UPDATED, expansion, userId);
      return AiProviderExpansionResponseDto.from(raw);
    }

    // Published (BETA/ACTIVE/DEPRECATED/DISABLED) — create a new DRAFT version instead of mutating.
    const raw = await this.repository.create({
      providerKey: existing.providerKey,
      workspaceId: existing.workspaceId,
      organizationId: existing.organizationId,
      rolloutState: AiProviderRolloutState.DRAFT,
      version: existing.version + 1,
      apiVersionLabel: dto.apiVersionLabel ?? existing.apiVersionLabel,
      backwardCompatibleApiVersions: dto.backwardCompatibleApiVersions ?? existing.backwardCompatibleApiVersions,
      eligibilityScope: dto.eligibilityScope ?? existing.eligibilityScope,
      eligibleWorkspaceIds: dto.eligibleWorkspaceIds ?? existing.eligibleWorkspaceIds,
      adapterCompatibilityStatus: AdapterCompatibilityStatus.UNVALIDATED,
      compatibilityIssues: [],
      featureFlags: dto.featureFlags ?? existing.featureFlags,
      onboardedAt: existing.onboardedAt,
      settings: dto.settings ?? existing.settings,
      metadata: dto.metadata ?? existing.metadata,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    const versioned = raw as unknown as IAiProviderExpansion;
    await this.audit.logExpansionChange(versioned, dto.changeReason ?? 'New version created', userId);
    this.publishEvent(AiProviderEventType.EXPANSION_UPDATED, versioned, userId, {
      note: 'new draft version created; the published version remains live until this one is promoted',
    });

    return AiProviderExpansionResponseDto.from(raw);
  }

  // ── Adapter Compatibility ──────────────────────────────────────

  async validateAdapterCompatibility(id: string, workspaceId: string, userId?: string): Promise<AiProviderExpansionResponseDto> {
    const existing = (await this.requireExpansion(id, workspaceId)) as unknown as IAiProviderExpansion;
    const result = await this.validator.validateAdapterCompatibility(existing.providerKey);

    const raw = await this.repository.update(id, {
      adapterCompatibilityStatus: result.status,
      compatibilityIssues: result.issues,
    });
    const expansion = raw as unknown as IAiProviderExpansion;
    this.cache.invalidate(expansion.providerKey, expansion.workspaceId);

    const eventType = result.status === AdapterCompatibilityStatus.COMPATIBLE
      ? AiProviderEventType.EXPANSION_COMPATIBILITY_VALIDATED
      : AiProviderEventType.EXPANSION_COMPATIBILITY_FAILED;
    this.publishEvent(eventType, expansion, userId, { issues: result.issues });

    return AiProviderExpansionResponseDto.from(raw);
  }

  // ── Rollout ─────────────────────────────────────────────────────

  async changeRolloutState(id: string, workspaceId: string, dto: PromoteRolloutDto, userId?: string): Promise<AiProviderExpansionResponseDto> {
    const existing = (await this.requireExpansion(id, workspaceId)) as unknown as IAiProviderExpansion;
    const allowed = AI_PROVIDER_EXPANSION_CONSTANTS.ALLOWED_ROLLOUT_TRANSITIONS[existing.rolloutState] ?? [];
    if (!allowed.includes(dto.targetState)) {
      throw new AiProviderExpansionInvalidTransitionException(existing.rolloutState, dto.targetState);
    }

    let compatibilityStatus = existing.adapterCompatibilityStatus;
    let compatibilityIssues = existing.compatibilityIssues;
    if (AI_PROVIDER_EXPANSION_CONSTANTS.ROLLOUT_STATES_REQUIRING_COMPATIBLE_ADAPTER.has(dto.targetState)) {
      const result = await this.validator.validateAdapterCompatibility(existing.providerKey);
      compatibilityStatus = result.status;
      compatibilityIssues = result.issues;
      if (result.status !== AdapterCompatibilityStatus.COMPATIBLE) {
        throw new AiProviderExpansionAdapterIncompatibleException(existing.providerKey, dto.targetState, result.issues);
      }
    }

    const timestampField = this.timestampFieldFor(dto.targetState);
    const raw = await this.repository.update(id, {
      rolloutState: dto.targetState,
      adapterCompatibilityStatus: compatibilityStatus,
      compatibilityIssues,
      ...(timestampField && { [timestampField]: new Date() }),
      updatedBy: userId ?? null,
    });

    const expansion = raw as unknown as IAiProviderExpansion;
    this.cache.invalidate(expansion.providerKey, expansion.workspaceId);

    const isPromotion = ROLLOUT_ORDER.indexOf(dto.targetState) >= ROLLOUT_ORDER.indexOf(existing.rolloutState);
    await this.audit.logExpansionChange(expansion, dto.reason ?? `Rollout state changed to ${dto.targetState}`, userId);
    this.publishEvent(isPromotion ? AiProviderEventType.EXPANSION_ROLLOUT_PROMOTED : AiProviderEventType.EXPANSION_ROLLOUT_DEMOTED, expansion, userId);
    if (dto.targetState === AiProviderRolloutState.DEPRECATED) {
      this.publishEvent(AiProviderEventType.EXPANSION_DEPRECATED, expansion, userId);
    }
    if (dto.targetState === AiProviderRolloutState.DISABLED) {
      this.publishEvent(AiProviderEventType.EXPANSION_DISABLED, expansion, userId);
    }

    return AiProviderExpansionResponseDto.from(raw);
  }

  async getExpansionHistory(id: string, workspaceId: string): Promise<AiProviderExpansionHistoryResponseDto[]> {
    await this.requireExpansion(id, workspaceId);
    const raws = await this.repository.findHistory(id);
    return raws.map((r) => AiProviderExpansionHistoryResponseDto.from(r as any));
  }

  // ── Eligibility ─────────────────────────────────────────────────

  async checkEligibility(providerKey: string, dto: CheckEligibilityDto): Promise<IEligibilityResult> {
    const raw = await this.repository.resolve(providerKey, dto.workspaceId);
    if (!raw) {
      return { eligible: false, reason: `AI provider '${providerKey}' has not been onboarded` };
    }
    const expansion = raw as unknown as IAiProviderExpansion;

    if (expansion.rolloutState === AiProviderRolloutState.DRAFT || expansion.rolloutState === AiProviderRolloutState.DISABLED) {
      return { eligible: false, reason: `AI provider '${providerKey}' is currently ${expansion.rolloutState}` };
    }

    if (expansion.eligibilityScope === 'ALLOWLIST' && !expansion.eligibleWorkspaceIds.includes(dto.workspaceId)) {
      return { eligible: false, reason: `Workspace is not on the eligibility allowlist for '${providerKey}'` };
    }

    return { eligible: true };
  }

  // ── Capability / Health / Version (thin delegates — never re-implemented) ──

  getSupportedCapabilities(providerKey: string): AiCapability[] {
    if (!this.registry.has(providerKey)) return [];
    return this.registry.get(providerKey).getMetadata().capabilities;
  }

  async checkHealth(providerKey: string): Promise<IAiProviderHealth> {
    const provider = this.registry.get(providerKey);
    return this.healthService.checkHealth(provider);
  }

  getVersionInfo(providerKey: string): { adapterVersion: string } {
    return { adapterVersion: this.registry.get(providerKey).getMetadata().version };
  }

  // ── Cache ───────────────────────────────────────────────────────

  invalidateCache(providerKey?: string, workspaceId?: string): void {
    if (providerKey) {
      this.cache.invalidateByProvider(providerKey);
    } else if (workspaceId) {
      this.cache.flush();
    } else {
      this.cache.flush();
    }
    this.eventEmitter.emit({
      type: AiProviderEventType.EXPANSION_CACHE_INVALIDATED,
      providerKey: providerKey ?? 'ALL',
      workspaceId,
      occurredAt: new Date(),
    });
  }

  // ── Helpers ───────────────────────────────────────────────────

  private timestampFieldFor(state: AiProviderRolloutState): string | null {
    switch (state) {
      case AiProviderRolloutState.BETA:
        return 'betaAt';
      case AiProviderRolloutState.ACTIVE:
        return 'activatedAt';
      case AiProviderRolloutState.DEPRECATED:
        return 'deprecatedAt';
      case AiProviderRolloutState.DISABLED:
        return 'disabledAt';
      default:
        return null;
    }
  }

  private async requireExpansion(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const raw = await this.repository.findById(id, workspaceId);
    if (!raw) {
      throw new AiProviderExpansionNotFoundException(id);
    }
    return raw;
  }

  private describeScope(providerKey: string, workspaceId: string | null): string {
    return workspaceId ? `provider '${providerKey}' in workspace '${workspaceId}'` : `provider '${providerKey}' (GLOBAL)`;
  }

  private publishEvent(
    type: AiProviderEventType,
    expansion: IAiProviderExpansion,
    performedBy?: string,
    extra?: Record<string, unknown>,
  ): void {
    this.eventEmitter.emit({
      type,
      providerKey: expansion.providerKey,
      workspaceId: expansion.workspaceId ?? undefined,
      occurredAt: new Date(),
      payload: {
        expansionId: expansion.id,
        rolloutState: expansion.rolloutState,
        performedBy: performedBy ?? 'system',
        ...extra,
      },
    });
  }
}
