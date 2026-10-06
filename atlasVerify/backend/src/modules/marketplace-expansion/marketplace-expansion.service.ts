import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory } from '@modules/audit-logs/interfaces';
import { MarketplaceProviderRegistry } from '@modules/marketplace-provider/registry/marketplace-provider.registry';
import { MarketplaceHealthMonitor } from '@modules/marketplace-provider/health/marketplace-health.monitor';
import { MarketplaceVersionManager } from '@modules/marketplace-provider/version/marketplace-version.manager';
import { MarketplaceHealthResult } from '@modules/marketplace-provider/interfaces';
import { MarketplaceExpansionRepository } from './repository/marketplace-expansion.repository';
import { MarketplaceExpansionCache } from './cache/marketplace-expansion.cache';
import { MarketplaceExpansionValidator } from './validator/marketplace-expansion.validator';
import { MarketplaceExpansionAudit } from './audit/marketplace-expansion.audit';
import { MarketplaceExpansionEventQueue } from './events/marketplace-expansion-events.queue';
import {
  AdapterCompatibilityStatus,
  IEligibilityResult,
  IMarketplaceExpansion,
  MarketplaceExpansionEvent,
  MarketplaceExpansionFilterOptions,
  MarketplaceRolloutState,
} from './interfaces';
import { MARKETPLACE_EXPANSION_CONSTANTS, MARKETPLACE_EXPANSION_ERROR_CODES, MARKETPLACE_EXPANSION_MODULE } from './constants';
import {
  CheckEligibilityDto,
  MarketplaceExpansionFilterDto,
  MarketplaceExpansionHistoryResponseDto,
  MarketplaceExpansionResponseDto,
  OnboardMarketplaceDto,
  PaginatedMarketplaceExpansionResponseDto,
  PromoteRolloutDto,
  UpdateMarketplaceExpansionDto,
} from './dto';

const ROLLOUT_ORDER: MarketplaceRolloutState[] = [
  MarketplaceRolloutState.DRAFT,
  MarketplaceRolloutState.BETA,
  MarketplaceRolloutState.ACTIVE,
  MarketplaceRolloutState.DEPRECATED,
  MarketplaceRolloutState.DISABLED,
];

@Injectable()
export class MarketplaceExpansionService {
  private readonly logger = new Logger(MarketplaceExpansionService.name);

  constructor(
    private readonly repository: MarketplaceExpansionRepository,
    private readonly cache: MarketplaceExpansionCache,
    private readonly validator: MarketplaceExpansionValidator,
    private readonly audit: MarketplaceExpansionAudit,
    private readonly eventQueue: MarketplaceExpansionEventQueue,
    private readonly auditLogsService: AuditLogsService,
    private readonly marketplaceProviderRegistry: MarketplaceProviderRegistry,
    private readonly marketplaceHealthMonitor: MarketplaceHealthMonitor,
    private readonly marketplaceVersionManager: MarketplaceVersionManager,
  ) {}

  // ── Onboarding ──────────────────────────────────────────────

  async onboardMarketplace(dto: OnboardMarketplaceDto, userId?: string): Promise<MarketplaceExpansionResponseDto> {
    const workspaceId = dto.workspaceId ?? null;
    const existing = await this.repository.findExpansion(dto.providerKey, workspaceId);
    if (existing) {
      throw new ConflictException({
        message: `Marketplace '${dto.providerKey}' is already onboarded for this scope`,
        code: MARKETPLACE_EXPANSION_ERROR_CODES.EXPANSION_DUPLICATE,
      });
    }

    const validation = await this.validator.validateExpansion({
      providerKey: dto.providerKey,
      countryCodes: dto.countryCodes ?? [],
      currencyCodes: dto.currencyCodes ?? [],
      localeCodes: dto.localeCodes ?? [],
    });
    if (!validation.valid) {
      throw new BadRequestException({
        message: `Invalid marketplace expansion: ${validation.issues.map((i) => i.message).join('; ')}`,
        code: MARKETPLACE_EXPANSION_ERROR_CODES.INVALID_EXPANSION,
      });
    }

    const raw = await this.repository.createExpansion({
      providerKey: dto.providerKey,
      workspaceId,
      organizationId: dto.organizationId ?? null,
      rolloutState: MarketplaceRolloutState.DRAFT,
      version: 1,
      apiVersionLabel: dto.apiVersionLabel ?? null,
      countryCodes: dto.countryCodes ?? [],
      regionCodes: dto.regionCodes ?? [],
      currencyCodes: dto.currencyCodes ?? [],
      localeCodes: dto.localeCodes ?? [],
      eligibilityScope: dto.eligibilityScope ?? 'ALL',
      eligibleWorkspaceIds: dto.eligibleWorkspaceIds ?? [],
      adapterCompatibilityStatus: AdapterCompatibilityStatus.UNVALIDATED,
      compatibilityIssues: [],
      backwardCompatibleApiVersions: dto.backwardCompatibleApiVersions ?? [],
      fallbackProviderKey: dto.fallbackProviderKey ?? null,
      featureFlags: dto.featureFlags ?? {},
      onboardedAt: new Date(),
      settings: dto.settings ?? {},
      metadata: dto.metadata ?? {},
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    const expansion = raw as unknown as IMarketplaceExpansion;
    await this.audit.logExpansionChange(expansion, 'Onboarded', userId);
    this.cache.invalidate(expansion.providerKey, expansion.workspaceId);
    await this.publishEvent(MarketplaceExpansionEvent.EXPANSION_ONBOARDED, {
      expansionId: expansion.id,
      providerKey: expansion.providerKey,
      workspaceId: expansion.workspaceId,
      rolloutState: expansion.rolloutState,
      changedBy: userId,
    });

    return MarketplaceExpansionResponseDto.from(expansion);
  }

  async findExpansions(filter: MarketplaceExpansionFilterDto): Promise<PaginatedMarketplaceExpansionResponseDto> {
    const [raws, total] = await this.repository.findExpansions(filter as MarketplaceExpansionFilterOptions);
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? MARKETPLACE_EXPANSION_CONSTANTS.DEFAULT_PAGE_SIZE, MARKETPLACE_EXPANSION_CONSTANTS.MAX_PAGE_SIZE);
    return {
      items: (raws as unknown as IMarketplaceExpansion[]).map((e) => MarketplaceExpansionResponseDto.from(e)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findExpansionById(id: string): Promise<MarketplaceExpansionResponseDto> {
    return MarketplaceExpansionResponseDto.from(await this.requireExpansion(id));
  }

  /** Prefers a workspace-scoped override over the platform-wide expansion for the same provider — cached, event-invalidated. */
  async resolveExpansion(providerKey: string, workspaceId: string): Promise<MarketplaceExpansionResponseDto | null> {
    const cached = this.cache.get(providerKey, workspaceId);
    if (cached) return MarketplaceExpansionResponseDto.from(cached);

    const raw = await this.repository.resolveExpansion(providerKey, workspaceId);
    if (!raw) return null;
    const expansion = raw as unknown as IMarketplaceExpansion;
    this.cache.set(expansion);
    return MarketplaceExpansionResponseDto.from(expansion);
  }

  /**
   * Mutates in place while the expansion is still DRAFT. Once
   * BETA/ACTIVE/DEPRECATED/DISABLED, an update instead creates a new
   * version — the live row is never touched.
   */
  async updateExpansion(id: string, dto: UpdateMarketplaceExpansionDto, userId?: string): Promise<MarketplaceExpansionResponseDto> {
    const existing = await this.requireExpansion(id);

    const validation = await this.validator.validateExpansion({
      providerKey: existing.providerKey,
      countryCodes: dto.countryCodes ?? existing.countryCodes,
      currencyCodes: dto.currencyCodes ?? existing.currencyCodes,
      localeCodes: dto.localeCodes ?? existing.localeCodes,
    });
    if (!validation.valid) {
      throw new BadRequestException({
        message: `Invalid marketplace expansion: ${validation.issues.map((i) => i.message).join('; ')}`,
        code: MARKETPLACE_EXPANSION_ERROR_CODES.INVALID_EXPANSION,
      });
    }

    if (existing.rolloutState === MarketplaceRolloutState.DRAFT) {
      const raw = await this.repository.updateExpansion(id, {
        ...(dto.apiVersionLabel !== undefined && { apiVersionLabel: dto.apiVersionLabel }),
        ...(dto.countryCodes !== undefined && { countryCodes: dto.countryCodes }),
        ...(dto.regionCodes !== undefined && { regionCodes: dto.regionCodes }),
        ...(dto.currencyCodes !== undefined && { currencyCodes: dto.currencyCodes }),
        ...(dto.localeCodes !== undefined && { localeCodes: dto.localeCodes }),
        ...(dto.eligibilityScope !== undefined && { eligibilityScope: dto.eligibilityScope }),
        ...(dto.eligibleWorkspaceIds !== undefined && { eligibleWorkspaceIds: dto.eligibleWorkspaceIds }),
        ...(dto.backwardCompatibleApiVersions !== undefined && { backwardCompatibleApiVersions: dto.backwardCompatibleApiVersions }),
        ...(dto.fallbackProviderKey !== undefined && { fallbackProviderKey: dto.fallbackProviderKey }),
        ...(dto.featureFlags !== undefined && { featureFlags: dto.featureFlags }),
        ...(dto.settings !== undefined && { settings: dto.settings }),
        ...(dto.metadata !== undefined && { metadata: dto.metadata }),
        updatedBy: userId ?? null,
      });

      const expansion = raw as unknown as IMarketplaceExpansion;
      this.cache.invalidate(expansion.providerKey, expansion.workspaceId);
      await this.audit.logExpansionChange(expansion, dto.changeReason ?? 'Updated', userId);
      await this.publishEvent(MarketplaceExpansionEvent.EXPANSION_UPDATED, {
        expansionId: expansion.id,
        providerKey: expansion.providerKey,
        workspaceId: expansion.workspaceId,
        rolloutState: expansion.rolloutState,
        changedBy: userId,
      });
      return MarketplaceExpansionResponseDto.from(expansion);
    }

    // Published (BETA/ACTIVE/DEPRECATED/DISABLED) — create a new DRAFT version instead of mutating.
    const raw = await this.repository.createExpansion({
      providerKey: existing.providerKey,
      workspaceId: existing.workspaceId,
      organizationId: existing.organizationId,
      rolloutState: MarketplaceRolloutState.DRAFT,
      version: existing.version + 1,
      apiVersionLabel: dto.apiVersionLabel ?? existing.apiVersionLabel,
      countryCodes: dto.countryCodes ?? existing.countryCodes,
      regionCodes: dto.regionCodes ?? existing.regionCodes,
      currencyCodes: dto.currencyCodes ?? existing.currencyCodes,
      localeCodes: dto.localeCodes ?? existing.localeCodes,
      eligibilityScope: dto.eligibilityScope ?? existing.eligibilityScope,
      eligibleWorkspaceIds: dto.eligibleWorkspaceIds ?? existing.eligibleWorkspaceIds,
      adapterCompatibilityStatus: AdapterCompatibilityStatus.UNVALIDATED,
      compatibilityIssues: [],
      backwardCompatibleApiVersions: dto.backwardCompatibleApiVersions ?? existing.backwardCompatibleApiVersions,
      fallbackProviderKey: dto.fallbackProviderKey ?? existing.fallbackProviderKey,
      featureFlags: dto.featureFlags ?? existing.featureFlags,
      onboardedAt: existing.onboardedAt,
      settings: dto.settings ?? existing.settings,
      metadata: dto.metadata ?? existing.metadata,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    const versioned = raw as unknown as IMarketplaceExpansion;
    await this.audit.logExpansionChange(versioned, dto.changeReason ?? 'New version created', userId);
    await this.publishEvent(MarketplaceExpansionEvent.EXPANSION_UPDATED, {
      expansionId: versioned.id,
      providerKey: versioned.providerKey,
      workspaceId: versioned.workspaceId,
      rolloutState: versioned.rolloutState,
      changedBy: userId,
      metadata: { note: 'new draft version created; the published version remains live until this one is promoted' },
    });

    return MarketplaceExpansionResponseDto.from(versioned);
  }

  // ── Adapter Compatibility ──────────────────────────────────────

  async validateAdapterCompatibility(id: string, userId?: string): Promise<MarketplaceExpansionResponseDto> {
    const existing = await this.requireExpansion(id);
    const result = await this.validator.validateAdapterCompatibility(existing.providerKey);

    const raw = await this.repository.updateExpansion(id, {
      adapterCompatibilityStatus: result.status,
      compatibilityIssues: result.issues,
    });
    const expansion = raw as unknown as IMarketplaceExpansion;
    this.cache.invalidate(expansion.providerKey, expansion.workspaceId);

    const event = result.status === AdapterCompatibilityStatus.COMPATIBLE
      ? MarketplaceExpansionEvent.COMPATIBILITY_VALIDATED
      : MarketplaceExpansionEvent.COMPATIBILITY_FAILED;
    await this.publishEvent(event, {
      expansionId: expansion.id,
      providerKey: expansion.providerKey,
      workspaceId: expansion.workspaceId,
      rolloutState: expansion.rolloutState,
      changedBy: userId,
      metadata: { issues: result.issues },
    });

    return MarketplaceExpansionResponseDto.from(expansion);
  }

  // ── Rollout ─────────────────────────────────────────────────────

  async changeRolloutState(id: string, dto: PromoteRolloutDto, userId?: string): Promise<MarketplaceExpansionResponseDto> {
    const existing = await this.requireExpansion(id);
    const allowed = MARKETPLACE_EXPANSION_CONSTANTS.ALLOWED_ROLLOUT_TRANSITIONS[existing.rolloutState] ?? [];
    if (!allowed.includes(dto.targetState)) {
      throw new BadRequestException({
        message: `Cannot transition marketplace expansion from '${existing.rolloutState}' to '${dto.targetState}'`,
        code: MARKETPLACE_EXPANSION_ERROR_CODES.INVALID_TRANSITION,
      });
    }

    let compatibilityStatus = existing.adapterCompatibilityStatus;
    let compatibilityIssues = existing.compatibilityIssues;
    if (MARKETPLACE_EXPANSION_CONSTANTS.ROLLOUT_STATES_REQUIRING_COMPATIBLE_ADAPTER.has(dto.targetState)) {
      const result = await this.validator.validateAdapterCompatibility(existing.providerKey);
      compatibilityStatus = result.status;
      compatibilityIssues = result.issues;
      if (result.status !== AdapterCompatibilityStatus.COMPATIBLE) {
        throw new BadRequestException({
          message: `Cannot promote marketplace '${existing.providerKey}' to '${dto.targetState}': adapter is not compatible (${result.issues.join('; ')})`,
          code: MARKETPLACE_EXPANSION_ERROR_CODES.ADAPTER_INCOMPATIBLE,
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

    const expansion = raw as unknown as IMarketplaceExpansion;
    this.cache.invalidate(expansion.providerKey, expansion.workspaceId);

    const isPromotion = ROLLOUT_ORDER.indexOf(dto.targetState) >= ROLLOUT_ORDER.indexOf(existing.rolloutState);
    await this.audit.logExpansionChange(expansion, dto.reason ?? `Rollout state changed to ${dto.targetState}`, userId);
    await this.publishEvent(isPromotion ? MarketplaceExpansionEvent.ROLLOUT_PROMOTED : MarketplaceExpansionEvent.ROLLOUT_DEMOTED, {
      expansionId: expansion.id,
      providerKey: expansion.providerKey,
      workspaceId: expansion.workspaceId,
      rolloutState: expansion.rolloutState,
      changedBy: userId,
    });
    if (dto.targetState === MarketplaceRolloutState.DEPRECATED) {
      await this.publishEvent(MarketplaceExpansionEvent.DEPRECATED, { expansionId: expansion.id, providerKey: expansion.providerKey, workspaceId: expansion.workspaceId, rolloutState: expansion.rolloutState, changedBy: userId });
    }
    if (dto.targetState === MarketplaceRolloutState.DISABLED) {
      await this.publishEvent(MarketplaceExpansionEvent.DISABLED, { expansionId: expansion.id, providerKey: expansion.providerKey, workspaceId: expansion.workspaceId, rolloutState: expansion.rolloutState, changedBy: userId });
    }
    await this.recordCentralAudit(`marketplace_expansion.rollout_${dto.targetState.toLowerCase()}`, expansion.workspaceId, userId, { providerKey: expansion.providerKey });

    return MarketplaceExpansionResponseDto.from(expansion);
  }

  async getExpansionHistory(id: string): Promise<MarketplaceExpansionHistoryResponseDto[]> {
    await this.requireExpansion(id);
    const raws = await this.repository.findExpansionHistory(id);
    return raws.map((r) => MarketplaceExpansionHistoryResponseDto.from(r as any));
  }

  // ── Eligibility ─────────────────────────────────────────────────

  async checkEligibility(providerKey: string, dto: CheckEligibilityDto): Promise<IEligibilityResult> {
    const raw = await this.repository.resolveExpansion(providerKey, dto.workspaceId);
    if (!raw) {
      return { eligible: false, reason: `Marketplace '${providerKey}' has not been onboarded` };
    }
    const expansion = raw as unknown as IMarketplaceExpansion;

    if (expansion.rolloutState === MarketplaceRolloutState.DRAFT || expansion.rolloutState === MarketplaceRolloutState.DISABLED) {
      return { eligible: false, reason: `Marketplace '${providerKey}' is currently ${expansion.rolloutState}` };
    }

    if (expansion.eligibilityScope === 'ALLOWLIST' && !expansion.eligibleWorkspaceIds.includes(dto.workspaceId)) {
      return { eligible: false, reason: `Workspace is not on the eligibility allowlist for '${providerKey}'` };
    }

    if (dto.countryCode && expansion.countryCodes.length > 0 && !expansion.countryCodes.includes(dto.countryCode.toUpperCase())) {
      return { eligible: false, reason: `Marketplace '${providerKey}' is not available in country '${dto.countryCode}'` };
    }

    return { eligible: true };
  }

  // ── Capability / Health / Version (thin delegates — never re-implemented) ──

  async getSupportedCapabilities(providerKey: string): Promise<string[]> {
    if (!this.marketplaceProviderRegistry.isRegistered(providerKey)) return [];
    return this.marketplaceProviderRegistry.get(providerKey).metadata.supportedCapabilities;
  }

  async checkHealth(providerKey: string, accountId?: string): Promise<MarketplaceHealthResult> {
    const adapter = this.marketplaceProviderRegistry.get(providerKey);
    return this.marketplaceHealthMonitor.checkOne(adapter, accountId);
  }

  getVersionInfo(providerKey: string) {
    return this.marketplaceVersionManager.getRecord(providerKey);
  }

  /** Routes to the configured fallback provider when the primary is DISABLED/DEPRECATED or its adapter isn't registered. */
  async resolveWithFallback(providerKey: string, workspaceId: string): Promise<{ providerKey: string; usedFallback: boolean }> {
    const raw = await this.repository.resolveExpansion(providerKey, workspaceId);
    const expansion = raw ? (raw as unknown as IMarketplaceExpansion) : null;

    const primaryUnavailable =
      !this.marketplaceProviderRegistry.isRegistered(providerKey) ||
      !expansion ||
      expansion.rolloutState === MarketplaceRolloutState.DISABLED;

    if (!primaryUnavailable) {
      return { providerKey, usedFallback: false };
    }

    if (expansion?.fallbackProviderKey && this.marketplaceProviderRegistry.isRegistered(expansion.fallbackProviderKey)) {
      await this.publishEvent(MarketplaceExpansionEvent.FALLBACK_USED, {
        expansionId: expansion.id,
        providerKey,
        workspaceId,
        metadata: { fallbackProviderKey: expansion.fallbackProviderKey },
      });
      return { providerKey: expansion.fallbackProviderKey, usedFallback: true };
    }

    throw new NotFoundException({
      message: `Marketplace '${providerKey}' is unavailable and no fallback is configured`,
      code: MARKETPLACE_EXPANSION_ERROR_CODES.NOT_ELIGIBLE,
    });
  }

  // ── Cache ───────────────────────────────────────────────────────

  async invalidateCache(providerKey?: string): Promise<void> {
    if (providerKey) {
      this.cache.invalidateByProvider(providerKey);
    } else {
      this.cache.flush();
    }
    await this.publishEvent(MarketplaceExpansionEvent.CACHE_INVALIDATED, { providerKey: providerKey ?? null });
  }

  // ── Helpers ───────────────────────────────────────────────────

  private timestampFieldFor(state: MarketplaceRolloutState): string | null {
    switch (state) {
      case MarketplaceRolloutState.BETA:
        return 'betaAt';
      case MarketplaceRolloutState.ACTIVE:
        return 'activatedAt';
      case MarketplaceRolloutState.DEPRECATED:
        return 'deprecatedAt';
      case MarketplaceRolloutState.DISABLED:
        return 'disabledAt';
      default:
        return null;
    }
  }

  private async requireExpansion(id: string): Promise<IMarketplaceExpansion> {
    const raw = await this.repository.findExpansionById(id);
    if (!raw) {
      throw new NotFoundException({ message: `Marketplace expansion '${id}' not found`, code: MARKETPLACE_EXPANSION_ERROR_CODES.EXPANSION_NOT_FOUND });
    }
    return raw as unknown as IMarketplaceExpansion;
  }

  private async publishEvent(
    event: MarketplaceExpansionEvent,
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
        module: MARKETPLACE_EXPANSION_MODULE,
        entityType: 'MarketplaceExpansion',
        outcome: ActivityOutcome.SUCCESS,
        metadata,
      });
    } catch (err) {
      this.logger.warn(`Failed to record central audit entry for '${action}': ${(err as Error).message}`);
    }
  }
}
