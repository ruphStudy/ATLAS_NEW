import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory } from '@modules/audit-logs/interfaces';
import { ShippingProviderRegistry } from '@modules/shipping-provider/registry/shipping-provider.registry';
import { ShippingProviderHealthMonitor } from '@modules/shipping-provider/health/shipping-provider-health.monitor';
import { ShippingProviderHealthResult } from '@modules/shipping-provider/interfaces';
import { ShippingProviderExpansionRepository } from './repository/shipping-provider-expansion.repository';
import { ShippingProviderExpansionCache } from './cache/shipping-provider-expansion.cache';
import { ShippingProviderExpansionValidator } from './validator/shipping-provider-expansion.validator';
import { ShippingProviderExpansionAudit } from './audit/shipping-provider-expansion.audit';
import { ShippingProviderExpansionEventQueue } from './events/shipping-provider-expansion-events.queue';
import {
  AdapterCompatibilityStatus,
  IEligibilityResult,
  IShippingProviderExpansion,
  ShippingProviderExpansionEvent,
  ShippingProviderExpansionFilterOptions,
  ShippingProviderRolloutState,
} from './interfaces';
import { SHIPPING_PROVIDER_EXPANSION_CONSTANTS, SHIPPING_PROVIDER_EXPANSION_ERROR_CODES, SHIPPING_PROVIDER_EXPANSION_MODULE } from './constants';
import {
  CheckEligibilityDto,
  OnboardShippingProviderDto,
  PaginatedShippingProviderExpansionResponseDto,
  PromoteRolloutDto,
  ShippingProviderExpansionFilterDto,
  ShippingProviderExpansionHistoryResponseDto,
  ShippingProviderExpansionResponseDto,
  UpdateShippingProviderExpansionDto,
} from './dto';

const ROLLOUT_ORDER: ShippingProviderRolloutState[] = [
  ShippingProviderRolloutState.DRAFT,
  ShippingProviderRolloutState.BETA,
  ShippingProviderRolloutState.ACTIVE,
  ShippingProviderRolloutState.DEPRECATED,
  ShippingProviderRolloutState.DISABLED,
];

@Injectable()
export class ShippingProviderExpansionService {
  private readonly logger = new Logger(ShippingProviderExpansionService.name);

  constructor(
    private readonly repository: ShippingProviderExpansionRepository,
    private readonly cache: ShippingProviderExpansionCache,
    private readonly validator: ShippingProviderExpansionValidator,
    private readonly audit: ShippingProviderExpansionAudit,
    private readonly eventQueue: ShippingProviderExpansionEventQueue,
    private readonly auditLogsService: AuditLogsService,
    private readonly shippingProviderRegistry: ShippingProviderRegistry,
    private readonly shippingProviderHealthMonitor: ShippingProviderHealthMonitor,
  ) {}

  // ── Onboarding ──────────────────────────────────────────────

  async onboardProvider(dto: OnboardShippingProviderDto, userId?: string): Promise<ShippingProviderExpansionResponseDto> {
    const workspaceId = dto.workspaceId ?? null;
    const existing = await this.repository.findExpansion(dto.providerKey, workspaceId);
    if (existing) {
      throw new ConflictException({
        message: `Shipping provider '${dto.providerKey}' is already onboarded for this scope`,
        code: SHIPPING_PROVIDER_EXPANSION_ERROR_CODES.EXPANSION_DUPLICATE,
      });
    }

    const validation = await this.validator.validateExpansion({
      providerKey: dto.providerKey,
      countryCodes: dto.countryCodes ?? [],
    });
    if (!validation.valid) {
      throw new BadRequestException({
        message: `Invalid shipping provider expansion: ${validation.issues.map((i) => i.message).join('; ')}`,
        code: SHIPPING_PROVIDER_EXPANSION_ERROR_CODES.INVALID_EXPANSION,
      });
    }

    const raw = await this.repository.createExpansion({
      providerKey: dto.providerKey,
      workspaceId,
      organizationId: dto.organizationId ?? null,
      rolloutState: ShippingProviderRolloutState.DRAFT,
      version: 1,
      apiVersionLabel: dto.apiVersionLabel ?? null,
      countryCodes: dto.countryCodes ?? [],
      regionCodes: dto.regionCodes ?? [],
      serviceLevels: dto.serviceLevels ?? [],
      eligibilityScope: dto.eligibilityScope ?? 'ALL',
      eligibleWorkspaceIds: dto.eligibleWorkspaceIds ?? [],
      adapterCompatibilityStatus: AdapterCompatibilityStatus.UNVALIDATED,
      compatibilityIssues: [],
      backwardCompatibleApiVersions: dto.backwardCompatibleApiVersions ?? [],
      fallbackProviderKey: dto.fallbackProviderKey ?? null,
      pickupRules: dto.pickupRules ?? {},
      rateLimitConfig: dto.rateLimitConfig ?? {},
      featureFlags: dto.featureFlags ?? {},
      onboardedAt: new Date(),
      settings: dto.settings ?? {},
      metadata: dto.metadata ?? {},
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    const expansion = raw as unknown as IShippingProviderExpansion;
    await this.audit.logExpansionChange(expansion, 'Onboarded', userId);
    this.cache.invalidate(expansion.providerKey, expansion.workspaceId);
    await this.publishEvent(ShippingProviderExpansionEvent.EXPANSION_ONBOARDED, {
      expansionId: expansion.id,
      providerKey: expansion.providerKey,
      workspaceId: expansion.workspaceId,
      rolloutState: expansion.rolloutState,
      changedBy: userId,
    });

    return ShippingProviderExpansionResponseDto.from(expansion);
  }

  async findExpansions(filter: ShippingProviderExpansionFilterDto): Promise<PaginatedShippingProviderExpansionResponseDto> {
    const [raws, total] = await this.repository.findExpansions(filter as ShippingProviderExpansionFilterOptions);
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? SHIPPING_PROVIDER_EXPANSION_CONSTANTS.DEFAULT_PAGE_SIZE, SHIPPING_PROVIDER_EXPANSION_CONSTANTS.MAX_PAGE_SIZE);
    return {
      items: (raws as unknown as IShippingProviderExpansion[]).map((e) => ShippingProviderExpansionResponseDto.from(e)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findExpansionById(id: string): Promise<ShippingProviderExpansionResponseDto> {
    return ShippingProviderExpansionResponseDto.from(await this.requireExpansion(id));
  }

  /** Prefers a workspace-scoped override over the platform-wide expansion for the same provider — cached, event-invalidated. */
  async resolveExpansion(providerKey: string, workspaceId: string): Promise<ShippingProviderExpansionResponseDto | null> {
    const cached = this.cache.get(providerKey, workspaceId);
    if (cached) return ShippingProviderExpansionResponseDto.from(cached);

    const raw = await this.repository.resolveExpansion(providerKey, workspaceId);
    if (!raw) return null;
    const expansion = raw as unknown as IShippingProviderExpansion;
    this.cache.set(expansion);
    return ShippingProviderExpansionResponseDto.from(expansion);
  }

  /**
   * Mutates in place while the expansion is still DRAFT. Once
   * BETA/ACTIVE/DEPRECATED/DISABLED, an update instead creates a new
   * version — the live row is never touched.
   */
  async updateExpansion(id: string, dto: UpdateShippingProviderExpansionDto, userId?: string): Promise<ShippingProviderExpansionResponseDto> {
    const existing = await this.requireExpansion(id);

    const validation = await this.validator.validateExpansion({
      providerKey: existing.providerKey,
      countryCodes: dto.countryCodes ?? existing.countryCodes,
    });
    if (!validation.valid) {
      throw new BadRequestException({
        message: `Invalid shipping provider expansion: ${validation.issues.map((i) => i.message).join('; ')}`,
        code: SHIPPING_PROVIDER_EXPANSION_ERROR_CODES.INVALID_EXPANSION,
      });
    }

    if (existing.rolloutState === ShippingProviderRolloutState.DRAFT) {
      const raw = await this.repository.updateExpansion(id, {
        ...(dto.apiVersionLabel !== undefined && { apiVersionLabel: dto.apiVersionLabel }),
        ...(dto.countryCodes !== undefined && { countryCodes: dto.countryCodes }),
        ...(dto.regionCodes !== undefined && { regionCodes: dto.regionCodes }),
        ...(dto.serviceLevels !== undefined && { serviceLevels: dto.serviceLevels }),
        ...(dto.eligibilityScope !== undefined && { eligibilityScope: dto.eligibilityScope }),
        ...(dto.eligibleWorkspaceIds !== undefined && { eligibleWorkspaceIds: dto.eligibleWorkspaceIds }),
        ...(dto.backwardCompatibleApiVersions !== undefined && { backwardCompatibleApiVersions: dto.backwardCompatibleApiVersions }),
        ...(dto.fallbackProviderKey !== undefined && { fallbackProviderKey: dto.fallbackProviderKey }),
        ...(dto.pickupRules !== undefined && { pickupRules: dto.pickupRules }),
        ...(dto.rateLimitConfig !== undefined && { rateLimitConfig: dto.rateLimitConfig }),
        ...(dto.featureFlags !== undefined && { featureFlags: dto.featureFlags }),
        ...(dto.settings !== undefined && { settings: dto.settings }),
        ...(dto.metadata !== undefined && { metadata: dto.metadata }),
        updatedBy: userId ?? null,
      });

      const expansion = raw as unknown as IShippingProviderExpansion;
      this.cache.invalidate(expansion.providerKey, expansion.workspaceId);
      await this.audit.logExpansionChange(expansion, dto.changeReason ?? 'Updated', userId);
      await this.publishEvent(ShippingProviderExpansionEvent.EXPANSION_UPDATED, {
        expansionId: expansion.id,
        providerKey: expansion.providerKey,
        workspaceId: expansion.workspaceId,
        rolloutState: expansion.rolloutState,
        changedBy: userId,
      });
      return ShippingProviderExpansionResponseDto.from(expansion);
    }

    // Published (BETA/ACTIVE/DEPRECATED/DISABLED) — create a new DRAFT version instead of mutating.
    const raw = await this.repository.createExpansion({
      providerKey: existing.providerKey,
      workspaceId: existing.workspaceId,
      organizationId: existing.organizationId,
      rolloutState: ShippingProviderRolloutState.DRAFT,
      version: existing.version + 1,
      apiVersionLabel: dto.apiVersionLabel ?? existing.apiVersionLabel,
      countryCodes: dto.countryCodes ?? existing.countryCodes,
      regionCodes: dto.regionCodes ?? existing.regionCodes,
      serviceLevels: dto.serviceLevels ?? existing.serviceLevels,
      eligibilityScope: dto.eligibilityScope ?? existing.eligibilityScope,
      eligibleWorkspaceIds: dto.eligibleWorkspaceIds ?? existing.eligibleWorkspaceIds,
      adapterCompatibilityStatus: AdapterCompatibilityStatus.UNVALIDATED,
      compatibilityIssues: [],
      backwardCompatibleApiVersions: dto.backwardCompatibleApiVersions ?? existing.backwardCompatibleApiVersions,
      fallbackProviderKey: dto.fallbackProviderKey ?? existing.fallbackProviderKey,
      pickupRules: dto.pickupRules ?? existing.pickupRules,
      rateLimitConfig: dto.rateLimitConfig ?? existing.rateLimitConfig,
      featureFlags: dto.featureFlags ?? existing.featureFlags,
      onboardedAt: existing.onboardedAt,
      settings: dto.settings ?? existing.settings,
      metadata: dto.metadata ?? existing.metadata,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    const versioned = raw as unknown as IShippingProviderExpansion;
    await this.audit.logExpansionChange(versioned, dto.changeReason ?? 'New version created', userId);
    await this.publishEvent(ShippingProviderExpansionEvent.EXPANSION_UPDATED, {
      expansionId: versioned.id,
      providerKey: versioned.providerKey,
      workspaceId: versioned.workspaceId,
      rolloutState: versioned.rolloutState,
      changedBy: userId,
      metadata: { note: 'new draft version created; the published version remains live until this one is promoted' },
    });

    return ShippingProviderExpansionResponseDto.from(versioned);
  }

  // ── Adapter Compatibility ──────────────────────────────────────

  async validateAdapterCompatibility(id: string, userId?: string): Promise<ShippingProviderExpansionResponseDto> {
    const existing = await this.requireExpansion(id);
    const result = await this.validator.validateAdapterCompatibility(existing.providerKey);

    const raw = await this.repository.updateExpansion(id, {
      adapterCompatibilityStatus: result.status,
      compatibilityIssues: result.issues,
    });
    const expansion = raw as unknown as IShippingProviderExpansion;
    this.cache.invalidate(expansion.providerKey, expansion.workspaceId);

    const event = result.status === AdapterCompatibilityStatus.COMPATIBLE
      ? ShippingProviderExpansionEvent.COMPATIBILITY_VALIDATED
      : ShippingProviderExpansionEvent.COMPATIBILITY_FAILED;
    await this.publishEvent(event, {
      expansionId: expansion.id,
      providerKey: expansion.providerKey,
      workspaceId: expansion.workspaceId,
      rolloutState: expansion.rolloutState,
      changedBy: userId,
      metadata: { issues: result.issues },
    });

    return ShippingProviderExpansionResponseDto.from(expansion);
  }

  // ── Rollout ─────────────────────────────────────────────────────

  async changeRolloutState(id: string, dto: PromoteRolloutDto, userId?: string): Promise<ShippingProviderExpansionResponseDto> {
    const existing = await this.requireExpansion(id);
    const allowed = SHIPPING_PROVIDER_EXPANSION_CONSTANTS.ALLOWED_ROLLOUT_TRANSITIONS[existing.rolloutState] ?? [];
    if (!allowed.includes(dto.targetState)) {
      throw new BadRequestException({
        message: `Cannot transition shipping provider expansion from '${existing.rolloutState}' to '${dto.targetState}'`,
        code: SHIPPING_PROVIDER_EXPANSION_ERROR_CODES.INVALID_TRANSITION,
      });
    }

    let compatibilityStatus = existing.adapterCompatibilityStatus;
    let compatibilityIssues = existing.compatibilityIssues;
    if (SHIPPING_PROVIDER_EXPANSION_CONSTANTS.ROLLOUT_STATES_REQUIRING_COMPATIBLE_ADAPTER.has(dto.targetState)) {
      const result = await this.validator.validateAdapterCompatibility(existing.providerKey);
      compatibilityStatus = result.status;
      compatibilityIssues = result.issues;
      if (result.status !== AdapterCompatibilityStatus.COMPATIBLE) {
        throw new BadRequestException({
          message: `Cannot promote shipping provider '${existing.providerKey}' to '${dto.targetState}': adapter is not compatible (${result.issues.join('; ')})`,
          code: SHIPPING_PROVIDER_EXPANSION_ERROR_CODES.ADAPTER_INCOMPATIBLE,
        });
      }
    }

    const timestampField = this.timestampFieldFor(dto.targetState);
    const raw = await this.repository.updateExpansion(id, {
      rolloutState: dto.targetState,
      adapterCompatibilityStatus: compatibilityStatus,
      compatibilityIssues,
      ...(timestampField && { [timestampField]: new Date() }),
      updatedBy: userId ?? null,
    });

    const expansion = raw as unknown as IShippingProviderExpansion;
    this.cache.invalidate(expansion.providerKey, expansion.workspaceId);

    const isPromotion = ROLLOUT_ORDER.indexOf(dto.targetState) >= ROLLOUT_ORDER.indexOf(existing.rolloutState);
    await this.audit.logExpansionChange(expansion, dto.reason ?? `Rollout state changed to ${dto.targetState}`, userId);
    await this.publishEvent(isPromotion ? ShippingProviderExpansionEvent.ROLLOUT_PROMOTED : ShippingProviderExpansionEvent.ROLLOUT_DEMOTED, {
      expansionId: expansion.id,
      providerKey: expansion.providerKey,
      workspaceId: expansion.workspaceId,
      rolloutState: expansion.rolloutState,
      changedBy: userId,
    });
    if (dto.targetState === ShippingProviderRolloutState.DEPRECATED) {
      await this.publishEvent(ShippingProviderExpansionEvent.DEPRECATED, { expansionId: expansion.id, providerKey: expansion.providerKey, workspaceId: expansion.workspaceId, rolloutState: expansion.rolloutState, changedBy: userId });
    }
    if (dto.targetState === ShippingProviderRolloutState.DISABLED) {
      await this.publishEvent(ShippingProviderExpansionEvent.DISABLED, { expansionId: expansion.id, providerKey: expansion.providerKey, workspaceId: expansion.workspaceId, rolloutState: expansion.rolloutState, changedBy: userId });
    }
    await this.recordCentralAudit(`shipping_provider_expansion.rollout_${dto.targetState.toLowerCase()}`, expansion.workspaceId, userId, { providerKey: expansion.providerKey });

    return ShippingProviderExpansionResponseDto.from(expansion);
  }

  async getExpansionHistory(id: string): Promise<ShippingProviderExpansionHistoryResponseDto[]> {
    await this.requireExpansion(id);
    const raws = await this.repository.findExpansionHistory(id);
    return raws.map((r) => ShippingProviderExpansionHistoryResponseDto.from(r as any));
  }

  // ── Eligibility ─────────────────────────────────────────────────

  async checkEligibility(providerKey: string, dto: CheckEligibilityDto): Promise<IEligibilityResult> {
    const raw = await this.repository.resolveExpansion(providerKey, dto.workspaceId);
    if (!raw) {
      return { eligible: false, reason: `Shipping provider '${providerKey}' has not been onboarded` };
    }
    const expansion = raw as unknown as IShippingProviderExpansion;

    if (expansion.rolloutState === ShippingProviderRolloutState.DRAFT || expansion.rolloutState === ShippingProviderRolloutState.DISABLED) {
      return { eligible: false, reason: `Shipping provider '${providerKey}' is currently ${expansion.rolloutState}` };
    }

    if (expansion.eligibilityScope === 'ALLOWLIST' && !expansion.eligibleWorkspaceIds.includes(dto.workspaceId)) {
      return { eligible: false, reason: `Workspace is not on the eligibility allowlist for '${providerKey}'` };
    }

    if (dto.countryCode && expansion.countryCodes.length > 0 && !expansion.countryCodes.includes(dto.countryCode.toUpperCase())) {
      return { eligible: false, reason: `Shipping provider '${providerKey}' is not available in country '${dto.countryCode}'` };
    }

    return { eligible: true };
  }

  // ── Capability / Health (thin delegates — never re-implemented) ──

  async getSupportedCapabilities(providerKey: string): Promise<string[]> {
    if (!this.shippingProviderRegistry.isRegistered(providerKey)) return [];
    return this.shippingProviderRegistry.get(providerKey).metadata.capabilities;
  }

  async checkHealth(providerKey: string): Promise<ShippingProviderHealthResult> {
    const adapter = this.shippingProviderRegistry.get(providerKey);
    return this.shippingProviderHealthMonitor.checkOne(adapter);
  }

  getVersionInfo(providerKey: string): { adapterVersion: unknown; apiVersionLabel?: string | null; backwardCompatibleApiVersions?: string[] } {
    const adapter = this.shippingProviderRegistry.get(providerKey);
    return { adapterVersion: adapter.metadata.version };
  }

  /** Routes to the configured fallback provider when the primary is DISABLED or its adapter isn't registered. */
  async resolveWithFallback(providerKey: string, workspaceId: string): Promise<{ providerKey: string; usedFallback: boolean }> {
    const raw = await this.repository.resolveExpansion(providerKey, workspaceId);
    const expansion = raw ? (raw as unknown as IShippingProviderExpansion) : null;

    const primaryUnavailable =
      !this.shippingProviderRegistry.isRegistered(providerKey) ||
      !expansion ||
      expansion.rolloutState === ShippingProviderRolloutState.DISABLED;

    if (!primaryUnavailable) {
      return { providerKey, usedFallback: false };
    }

    if (expansion?.fallbackProviderKey && this.shippingProviderRegistry.isRegistered(expansion.fallbackProviderKey)) {
      await this.publishEvent(ShippingProviderExpansionEvent.FALLBACK_USED, {
        expansionId: expansion.id,
        providerKey,
        workspaceId,
        metadata: { fallbackProviderKey: expansion.fallbackProviderKey },
      });
      return { providerKey: expansion.fallbackProviderKey, usedFallback: true };
    }

    throw new NotFoundException({
      message: `Shipping provider '${providerKey}' is unavailable and no fallback is configured`,
      code: SHIPPING_PROVIDER_EXPANSION_ERROR_CODES.NOT_ELIGIBLE,
    });
  }

  // ── Cache ───────────────────────────────────────────────────────

  async invalidateCache(providerKey?: string): Promise<void> {
    if (providerKey) {
      this.cache.invalidateByProvider(providerKey);
    } else {
      this.cache.flush();
    }
    await this.publishEvent(ShippingProviderExpansionEvent.CACHE_INVALIDATED, { providerKey: providerKey ?? null });
  }

  // ── Helpers ───────────────────────────────────────────────────

  private timestampFieldFor(state: ShippingProviderRolloutState): string | null {
    switch (state) {
      case ShippingProviderRolloutState.BETA:
        return 'betaAt';
      case ShippingProviderRolloutState.ACTIVE:
        return 'activatedAt';
      case ShippingProviderRolloutState.DEPRECATED:
        return 'deprecatedAt';
      case ShippingProviderRolloutState.DISABLED:
        return 'disabledAt';
      default:
        return null;
    }
  }

  private async requireExpansion(id: string): Promise<IShippingProviderExpansion> {
    const raw = await this.repository.findExpansionById(id);
    if (!raw) {
      throw new NotFoundException({ message: `Shipping provider expansion '${id}' not found`, code: SHIPPING_PROVIDER_EXPANSION_ERROR_CODES.EXPANSION_NOT_FOUND });
    }
    return raw as unknown as IShippingProviderExpansion;
  }

  private async publishEvent(
    event: ShippingProviderExpansionEvent,
    fields: {
      expansionId?: string | null;
      providerKey?: string | null;
      workspaceId?: string | null;
      rolloutState?: string | null;
      changedBy?: string | null;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.eventQueue.enqueue({
      event,
      expansionId: fields.expansionId ?? null,
      providerKey: fields.providerKey ?? null,
      workspaceId: fields.workspaceId ?? null,
      rolloutState: fields.rolloutState ?? null,
      changedBy: fields.changedBy ?? null,
      metadata: fields.metadata,
      timestamp: new Date(),
    });
  }

  private async recordCentralAudit(action: string, workspaceId: string | null | undefined, performedBy?: string, metadata?: Record<string, unknown>): Promise<void> {
    if (!workspaceId) return;
    try {
      await this.auditLogsService.record({
        workspaceId,
        actorType: ActivityActorType.USER,
        actorId: performedBy,
        action,
        actionCategory: AuditActionCategory.CONFIGURATION,
        module: SHIPPING_PROVIDER_EXPANSION_MODULE,
        entityType: 'ShippingProviderExpansion',
        outcome: ActivityOutcome.SUCCESS,
        metadata,
      });
    } catch (err) {
      this.logger.warn(`Failed to record central audit entry for '${action}': ${(err as Error).message}`);
    }
  }
}
