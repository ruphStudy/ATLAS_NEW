import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory } from '@modules/audit-logs/interfaces';
import { SupplierProviderRegistry } from '@modules/supplier-provider/registry/supplier-provider.registry';
import { SupplierProviderHealthMonitor } from '@modules/supplier-provider/health/supplier-provider-health.monitor';
import { ProviderHealthResult } from '@modules/supplier-provider/interfaces';
import { SupplierProviderExpansionRepository } from './repository/supplier-provider-expansion.repository';
import { SupplierProviderExpansionCache } from './cache/supplier-provider-expansion.cache';
import { SupplierProviderExpansionValidator } from './validator/supplier-provider-expansion.validator';
import { SupplierProviderExpansionAudit } from './audit/supplier-provider-expansion.audit';
import { SupplierProviderExpansionEventQueue } from './events/supplier-provider-expansion-events.queue';
import {
  AdapterCompatibilityStatus,
  IEligibilityResult,
  ISupplierProviderExpansion,
  SupplierProviderExpansionEvent,
  SupplierProviderExpansionFilterOptions,
  SupplierProviderRolloutState,
} from './interfaces';
import { SUPPLIER_PROVIDER_EXPANSION_CONSTANTS, SUPPLIER_PROVIDER_EXPANSION_ERROR_CODES, SUPPLIER_PROVIDER_EXPANSION_MODULE } from './constants';
import {
  CheckEligibilityDto,
  OnboardSupplierProviderDto,
  PaginatedSupplierProviderExpansionResponseDto,
  PromoteRolloutDto,
  SupplierProviderExpansionFilterDto,
  SupplierProviderExpansionHistoryResponseDto,
  SupplierProviderExpansionResponseDto,
  UpdateSupplierProviderExpansionDto,
} from './dto';

const ROLLOUT_ORDER: SupplierProviderRolloutState[] = [
  SupplierProviderRolloutState.DRAFT,
  SupplierProviderRolloutState.BETA,
  SupplierProviderRolloutState.ACTIVE,
  SupplierProviderRolloutState.DEPRECATED,
  SupplierProviderRolloutState.DISABLED,
];

@Injectable()
export class SupplierProviderExpansionService {
  private readonly logger = new Logger(SupplierProviderExpansionService.name);

  constructor(
    private readonly repository: SupplierProviderExpansionRepository,
    private readonly cache: SupplierProviderExpansionCache,
    private readonly validator: SupplierProviderExpansionValidator,
    private readonly audit: SupplierProviderExpansionAudit,
    private readonly eventQueue: SupplierProviderExpansionEventQueue,
    private readonly auditLogsService: AuditLogsService,
    private readonly supplierProviderRegistry: SupplierProviderRegistry,
    private readonly supplierProviderHealthMonitor: SupplierProviderHealthMonitor,
  ) {}

  // ── Onboarding ──────────────────────────────────────────────

  async onboardProvider(dto: OnboardSupplierProviderDto, userId?: string): Promise<SupplierProviderExpansionResponseDto> {
    const workspaceId = dto.workspaceId ?? null;
    const existing = await this.repository.findExpansion(dto.providerCode, workspaceId);
    if (existing) {
      throw new ConflictException({
        message: `Supplier provider '${dto.providerCode}' is already onboarded for this scope`,
        code: SUPPLIER_PROVIDER_EXPANSION_ERROR_CODES.EXPANSION_DUPLICATE,
      });
    }

    const validation = await this.validator.validateExpansion({
      providerCode: dto.providerCode,
      countryCodes: dto.countryCodes ?? [],
      currencyCodes: dto.currencyCodes ?? [],
    });
    if (!validation.valid) {
      throw new BadRequestException({
        message: `Invalid supplier provider expansion: ${validation.issues.map((i) => i.message).join('; ')}`,
        code: SUPPLIER_PROVIDER_EXPANSION_ERROR_CODES.INVALID_EXPANSION,
      });
    }

    const raw = await this.repository.createExpansion({
      providerCode: dto.providerCode,
      workspaceId,
      organizationId: dto.organizationId ?? null,
      rolloutState: SupplierProviderRolloutState.DRAFT,
      version: 1,
      apiVersionLabel: dto.apiVersionLabel ?? null,
      countryCodes: dto.countryCodes ?? [],
      regionCodes: dto.regionCodes ?? [],
      currencyCodes: dto.currencyCodes ?? [],
      integrationStrategies: dto.integrationStrategies ?? [],
      eligibilityScope: dto.eligibilityScope ?? 'ALL',
      eligibleWorkspaceIds: dto.eligibleWorkspaceIds ?? [],
      adapterCompatibilityStatus: AdapterCompatibilityStatus.UNVALIDATED,
      compatibilityIssues: [],
      backwardCompatibleApiVersions: dto.backwardCompatibleApiVersions ?? [],
      fallbackProviderCode: dto.fallbackProviderCode ?? null,
      endpointConfig: dto.endpointConfig ?? {},
      rateLimitConfig: dto.rateLimitConfig ?? {},
      featureFlags: dto.featureFlags ?? {},
      onboardedAt: new Date(),
      settings: dto.settings ?? {},
      metadata: dto.metadata ?? {},
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    const expansion = raw as unknown as ISupplierProviderExpansion;
    await this.audit.logExpansionChange(expansion, 'Onboarded', userId);
    this.cache.invalidate(expansion.providerCode, expansion.workspaceId);
    await this.publishEvent(SupplierProviderExpansionEvent.EXPANSION_ONBOARDED, {
      expansionId: expansion.id,
      providerCode: expansion.providerCode,
      workspaceId: expansion.workspaceId,
      rolloutState: expansion.rolloutState,
      changedBy: userId,
    });

    return SupplierProviderExpansionResponseDto.from(expansion);
  }

  async findExpansions(filter: SupplierProviderExpansionFilterDto): Promise<PaginatedSupplierProviderExpansionResponseDto> {
    const [raws, total] = await this.repository.findExpansions(filter as SupplierProviderExpansionFilterOptions);
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? SUPPLIER_PROVIDER_EXPANSION_CONSTANTS.DEFAULT_PAGE_SIZE, SUPPLIER_PROVIDER_EXPANSION_CONSTANTS.MAX_PAGE_SIZE);
    return {
      items: (raws as unknown as ISupplierProviderExpansion[]).map((e) => SupplierProviderExpansionResponseDto.from(e)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findExpansionById(id: string): Promise<SupplierProviderExpansionResponseDto> {
    return SupplierProviderExpansionResponseDto.from(await this.requireExpansion(id));
  }

  /** Prefers a workspace-scoped override over the platform-wide expansion for the same provider — cached, event-invalidated. */
  async resolveExpansion(providerCode: string, workspaceId: string): Promise<SupplierProviderExpansionResponseDto | null> {
    const cached = this.cache.get(providerCode, workspaceId);
    if (cached) return SupplierProviderExpansionResponseDto.from(cached);

    const raw = await this.repository.resolveExpansion(providerCode, workspaceId);
    if (!raw) return null;
    const expansion = raw as unknown as ISupplierProviderExpansion;
    this.cache.set(expansion);
    return SupplierProviderExpansionResponseDto.from(expansion);
  }

  /**
   * Mutates in place while the expansion is still DRAFT. Once
   * BETA/ACTIVE/DEPRECATED/DISABLED, an update instead creates a new
   * version — the live row is never touched.
   */
  async updateExpansion(id: string, dto: UpdateSupplierProviderExpansionDto, userId?: string): Promise<SupplierProviderExpansionResponseDto> {
    const existing = await this.requireExpansion(id);

    const validation = await this.validator.validateExpansion({
      providerCode: existing.providerCode,
      countryCodes: dto.countryCodes ?? existing.countryCodes,
      currencyCodes: dto.currencyCodes ?? existing.currencyCodes,
    });
    if (!validation.valid) {
      throw new BadRequestException({
        message: `Invalid supplier provider expansion: ${validation.issues.map((i) => i.message).join('; ')}`,
        code: SUPPLIER_PROVIDER_EXPANSION_ERROR_CODES.INVALID_EXPANSION,
      });
    }

    if (existing.rolloutState === SupplierProviderRolloutState.DRAFT) {
      const raw = await this.repository.updateExpansion(id, {
        ...(dto.apiVersionLabel !== undefined && { apiVersionLabel: dto.apiVersionLabel }),
        ...(dto.countryCodes !== undefined && { countryCodes: dto.countryCodes }),
        ...(dto.regionCodes !== undefined && { regionCodes: dto.regionCodes }),
        ...(dto.currencyCodes !== undefined && { currencyCodes: dto.currencyCodes }),
        ...(dto.integrationStrategies !== undefined && { integrationStrategies: dto.integrationStrategies }),
        ...(dto.eligibilityScope !== undefined && { eligibilityScope: dto.eligibilityScope }),
        ...(dto.eligibleWorkspaceIds !== undefined && { eligibleWorkspaceIds: dto.eligibleWorkspaceIds }),
        ...(dto.backwardCompatibleApiVersions !== undefined && { backwardCompatibleApiVersions: dto.backwardCompatibleApiVersions }),
        ...(dto.fallbackProviderCode !== undefined && { fallbackProviderCode: dto.fallbackProviderCode }),
        ...(dto.endpointConfig !== undefined && { endpointConfig: dto.endpointConfig }),
        ...(dto.rateLimitConfig !== undefined && { rateLimitConfig: dto.rateLimitConfig }),
        ...(dto.featureFlags !== undefined && { featureFlags: dto.featureFlags }),
        ...(dto.settings !== undefined && { settings: dto.settings }),
        ...(dto.metadata !== undefined && { metadata: dto.metadata }),
        updatedBy: userId ?? null,
      });

      const expansion = raw as unknown as ISupplierProviderExpansion;
      this.cache.invalidate(expansion.providerCode, expansion.workspaceId);
      await this.audit.logExpansionChange(expansion, dto.changeReason ?? 'Updated', userId);
      await this.publishEvent(SupplierProviderExpansionEvent.EXPANSION_UPDATED, {
        expansionId: expansion.id,
        providerCode: expansion.providerCode,
        workspaceId: expansion.workspaceId,
        rolloutState: expansion.rolloutState,
        changedBy: userId,
      });
      return SupplierProviderExpansionResponseDto.from(expansion);
    }

    // Published (BETA/ACTIVE/DEPRECATED/DISABLED) — create a new DRAFT version instead of mutating.
    const raw = await this.repository.createExpansion({
      providerCode: existing.providerCode,
      workspaceId: existing.workspaceId,
      organizationId: existing.organizationId,
      rolloutState: SupplierProviderRolloutState.DRAFT,
      version: existing.version + 1,
      apiVersionLabel: dto.apiVersionLabel ?? existing.apiVersionLabel,
      countryCodes: dto.countryCodes ?? existing.countryCodes,
      regionCodes: dto.regionCodes ?? existing.regionCodes,
      currencyCodes: dto.currencyCodes ?? existing.currencyCodes,
      integrationStrategies: dto.integrationStrategies ?? existing.integrationStrategies,
      eligibilityScope: dto.eligibilityScope ?? existing.eligibilityScope,
      eligibleWorkspaceIds: dto.eligibleWorkspaceIds ?? existing.eligibleWorkspaceIds,
      adapterCompatibilityStatus: AdapterCompatibilityStatus.UNVALIDATED,
      compatibilityIssues: [],
      backwardCompatibleApiVersions: dto.backwardCompatibleApiVersions ?? existing.backwardCompatibleApiVersions,
      fallbackProviderCode: dto.fallbackProviderCode ?? existing.fallbackProviderCode,
      endpointConfig: dto.endpointConfig ?? existing.endpointConfig,
      rateLimitConfig: dto.rateLimitConfig ?? existing.rateLimitConfig,
      featureFlags: dto.featureFlags ?? existing.featureFlags,
      onboardedAt: existing.onboardedAt,
      settings: dto.settings ?? existing.settings,
      metadata: dto.metadata ?? existing.metadata,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    const versioned = raw as unknown as ISupplierProviderExpansion;
    await this.audit.logExpansionChange(versioned, dto.changeReason ?? 'New version created', userId);
    await this.publishEvent(SupplierProviderExpansionEvent.EXPANSION_UPDATED, {
      expansionId: versioned.id,
      providerCode: versioned.providerCode,
      workspaceId: versioned.workspaceId,
      rolloutState: versioned.rolloutState,
      changedBy: userId,
      metadata: { note: 'new draft version created; the published version remains live until this one is promoted' },
    });

    return SupplierProviderExpansionResponseDto.from(versioned);
  }

  // ── Adapter Compatibility ──────────────────────────────────────

  async validateAdapterCompatibility(id: string, userId?: string): Promise<SupplierProviderExpansionResponseDto> {
    const existing = await this.requireExpansion(id);
    const result = await this.validator.validateAdapterCompatibility(existing.providerCode);

    const raw = await this.repository.updateExpansion(id, {
      adapterCompatibilityStatus: result.status,
      compatibilityIssues: result.issues,
    });
    const expansion = raw as unknown as ISupplierProviderExpansion;
    this.cache.invalidate(expansion.providerCode, expansion.workspaceId);

    const event = result.status === AdapterCompatibilityStatus.COMPATIBLE
      ? SupplierProviderExpansionEvent.COMPATIBILITY_VALIDATED
      : SupplierProviderExpansionEvent.COMPATIBILITY_FAILED;
    await this.publishEvent(event, {
      expansionId: expansion.id,
      providerCode: expansion.providerCode,
      workspaceId: expansion.workspaceId,
      rolloutState: expansion.rolloutState,
      changedBy: userId,
      metadata: { issues: result.issues },
    });

    return SupplierProviderExpansionResponseDto.from(expansion);
  }

  // ── Rollout ─────────────────────────────────────────────────────

  async changeRolloutState(id: string, dto: PromoteRolloutDto, userId?: string): Promise<SupplierProviderExpansionResponseDto> {
    const existing = await this.requireExpansion(id);
    const allowed = SUPPLIER_PROVIDER_EXPANSION_CONSTANTS.ALLOWED_ROLLOUT_TRANSITIONS[existing.rolloutState] ?? [];
    if (!allowed.includes(dto.targetState)) {
      throw new BadRequestException({
        message: `Cannot transition supplier provider expansion from '${existing.rolloutState}' to '${dto.targetState}'`,
        code: SUPPLIER_PROVIDER_EXPANSION_ERROR_CODES.INVALID_TRANSITION,
      });
    }

    let compatibilityStatus = existing.adapterCompatibilityStatus;
    let compatibilityIssues = existing.compatibilityIssues;
    if (SUPPLIER_PROVIDER_EXPANSION_CONSTANTS.ROLLOUT_STATES_REQUIRING_COMPATIBLE_ADAPTER.has(dto.targetState)) {
      const result = await this.validator.validateAdapterCompatibility(existing.providerCode);
      compatibilityStatus = result.status;
      compatibilityIssues = result.issues;
      if (result.status !== AdapterCompatibilityStatus.COMPATIBLE) {
        throw new BadRequestException({
          message: `Cannot promote supplier provider '${existing.providerCode}' to '${dto.targetState}': adapter is not compatible (${result.issues.join('; ')})`,
          code: SUPPLIER_PROVIDER_EXPANSION_ERROR_CODES.ADAPTER_INCOMPATIBLE,
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

    const expansion = raw as unknown as ISupplierProviderExpansion;
    this.cache.invalidate(expansion.providerCode, expansion.workspaceId);

    const isPromotion = ROLLOUT_ORDER.indexOf(dto.targetState) >= ROLLOUT_ORDER.indexOf(existing.rolloutState);
    await this.audit.logExpansionChange(expansion, dto.reason ?? `Rollout state changed to ${dto.targetState}`, userId);
    await this.publishEvent(isPromotion ? SupplierProviderExpansionEvent.ROLLOUT_PROMOTED : SupplierProviderExpansionEvent.ROLLOUT_DEMOTED, {
      expansionId: expansion.id,
      providerCode: expansion.providerCode,
      workspaceId: expansion.workspaceId,
      rolloutState: expansion.rolloutState,
      changedBy: userId,
    });
    if (dto.targetState === SupplierProviderRolloutState.DEPRECATED) {
      await this.publishEvent(SupplierProviderExpansionEvent.DEPRECATED, { expansionId: expansion.id, providerCode: expansion.providerCode, workspaceId: expansion.workspaceId, rolloutState: expansion.rolloutState, changedBy: userId });
    }
    if (dto.targetState === SupplierProviderRolloutState.DISABLED) {
      await this.publishEvent(SupplierProviderExpansionEvent.DISABLED, { expansionId: expansion.id, providerCode: expansion.providerCode, workspaceId: expansion.workspaceId, rolloutState: expansion.rolloutState, changedBy: userId });
    }
    await this.recordCentralAudit(`supplier_provider_expansion.rollout_${dto.targetState.toLowerCase()}`, expansion.workspaceId, userId, { providerCode: expansion.providerCode });

    return SupplierProviderExpansionResponseDto.from(expansion);
  }

  async getExpansionHistory(id: string): Promise<SupplierProviderExpansionHistoryResponseDto[]> {
    await this.requireExpansion(id);
    const raws = await this.repository.findExpansionHistory(id);
    return raws.map((r) => SupplierProviderExpansionHistoryResponseDto.from(r as any));
  }

  // ── Eligibility ─────────────────────────────────────────────────

  async checkEligibility(providerCode: string, dto: CheckEligibilityDto): Promise<IEligibilityResult> {
    const raw = await this.repository.resolveExpansion(providerCode, dto.workspaceId);
    if (!raw) {
      return { eligible: false, reason: `Supplier provider '${providerCode}' has not been onboarded` };
    }
    const expansion = raw as unknown as ISupplierProviderExpansion;

    if (expansion.rolloutState === SupplierProviderRolloutState.DRAFT || expansion.rolloutState === SupplierProviderRolloutState.DISABLED) {
      return { eligible: false, reason: `Supplier provider '${providerCode}' is currently ${expansion.rolloutState}` };
    }

    if (expansion.eligibilityScope === 'ALLOWLIST' && !expansion.eligibleWorkspaceIds.includes(dto.workspaceId)) {
      return { eligible: false, reason: `Workspace is not on the eligibility allowlist for '${providerCode}'` };
    }

    if (dto.countryCode && expansion.countryCodes.length > 0 && !expansion.countryCodes.includes(dto.countryCode.toUpperCase())) {
      return { eligible: false, reason: `Supplier provider '${providerCode}' is not available in country '${dto.countryCode}'` };
    }

    return { eligible: true };
  }

  // ── Capability / Health / Version (thin delegates — never re-implemented) ──

  async getSupportedCapabilities(providerCode: string): Promise<string[]> {
    if (!this.supplierProviderRegistry.isRegistered(providerCode)) return [];
    return this.supplierProviderRegistry.get(providerCode).metadata.capabilities;
  }

  async checkHealth(providerCode: string): Promise<ProviderHealthResult> {
    const adapter = this.supplierProviderRegistry.get(providerCode);
    return this.supplierProviderHealthMonitor.checkOne(adapter);
  }

  getVersionInfo(providerCode: string): { adapterVersion: unknown; apiVersionLabel?: string | null; backwardCompatibleApiVersions?: string[] } {
    const adapter = this.supplierProviderRegistry.get(providerCode);
    return { adapterVersion: adapter.metadata.version };
  }

  /** Routes to the configured fallback provider when the primary is DISABLED or its adapter isn't registered. */
  async resolveWithFallback(providerCode: string, workspaceId: string): Promise<{ providerCode: string; usedFallback: boolean }> {
    const raw = await this.repository.resolveExpansion(providerCode, workspaceId);
    const expansion = raw ? (raw as unknown as ISupplierProviderExpansion) : null;

    const primaryUnavailable =
      !this.supplierProviderRegistry.isRegistered(providerCode) ||
      !expansion ||
      expansion.rolloutState === SupplierProviderRolloutState.DISABLED;

    if (!primaryUnavailable) {
      return { providerCode, usedFallback: false };
    }

    if (expansion?.fallbackProviderCode && this.supplierProviderRegistry.isRegistered(expansion.fallbackProviderCode)) {
      await this.publishEvent(SupplierProviderExpansionEvent.FALLBACK_USED, {
        expansionId: expansion.id,
        providerCode,
        workspaceId,
        metadata: { fallbackProviderCode: expansion.fallbackProviderCode },
      });
      return { providerCode: expansion.fallbackProviderCode, usedFallback: true };
    }

    throw new NotFoundException({
      message: `Supplier provider '${providerCode}' is unavailable and no fallback is configured`,
      code: SUPPLIER_PROVIDER_EXPANSION_ERROR_CODES.NOT_ELIGIBLE,
    });
  }

  // ── Cache ───────────────────────────────────────────────────────

  async invalidateCache(providerCode?: string): Promise<void> {
    if (providerCode) {
      this.cache.invalidateByProvider(providerCode);
    } else {
      this.cache.flush();
    }
    await this.publishEvent(SupplierProviderExpansionEvent.CACHE_INVALIDATED, { providerCode: providerCode ?? null });
  }

  // ── Helpers ───────────────────────────────────────────────────

  private timestampFieldFor(state: SupplierProviderRolloutState): string | null {
    switch (state) {
      case SupplierProviderRolloutState.BETA:
        return 'betaAt';
      case SupplierProviderRolloutState.ACTIVE:
        return 'activatedAt';
      case SupplierProviderRolloutState.DEPRECATED:
        return 'deprecatedAt';
      case SupplierProviderRolloutState.DISABLED:
        return 'disabledAt';
      default:
        return null;
    }
  }

  private async requireExpansion(id: string): Promise<ISupplierProviderExpansion> {
    const raw = await this.repository.findExpansionById(id);
    if (!raw) {
      throw new NotFoundException({ message: `Supplier provider expansion '${id}' not found`, code: SUPPLIER_PROVIDER_EXPANSION_ERROR_CODES.EXPANSION_NOT_FOUND });
    }
    return raw as unknown as ISupplierProviderExpansion;
  }

  private async publishEvent(
    event: SupplierProviderExpansionEvent,
    fields: {
      expansionId?: string | null;
      providerCode?: string | null;
      workspaceId?: string | null;
      rolloutState?: string | null;
      changedBy?: string | null;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.eventQueue.enqueue({
      event,
      expansionId: fields.expansionId ?? null,
      providerCode: fields.providerCode ?? null,
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
        module: SUPPLIER_PROVIDER_EXPANSION_MODULE,
        entityType: 'SupplierProviderExpansion',
        outcome: ActivityOutcome.SUCCESS,
        metadata,
      });
    } catch (err) {
      this.logger.warn(`Failed to record central audit entry for '${action}': ${(err as Error).message}`);
    }
  }
}
