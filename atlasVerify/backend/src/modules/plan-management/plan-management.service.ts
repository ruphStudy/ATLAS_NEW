import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SettingsService } from '@modules/settings/settings.service';
import { SettingDefinitionAlreadyExistsException } from '@modules/settings/exceptions/settings.exceptions';
import { SettingScope, SettingValueType } from '@modules/settings/interfaces';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory } from '@modules/audit-logs/interfaces';
import { PlanManagementRepository } from './plan-management.repository';
import { PlanCacheService } from './plan-cache.service';
import { PlanManagementEventQueue } from './jobs';
import { validatePlanEntitlements, validatePlanLimits, validatePlanPrices, IPlanValidationIssue } from './entitlement-validator.util';
import { CreatePlanDto, UpdatePlanDto, PublishPlanDto, PlanReasonDto, PlanFilterDto, PaginatedPlanResponseDto } from './dto';
import {
  IPlan,
  IPlanEntitlement,
  IPlanEntitlementSnapshot,
  IPlanHistory,
  IPlanLimit,
  IPlanCompatibilityResult,
  PlanStatus,
  PlanChangeType,
  PlanManagementEvent,
  PlanTransitionDirection,
} from './interfaces';
import { PLAN_ALLOWED_TRANSITIONS, PLAN_MANAGEMENT_MODULE, DEFAULT_PLAN_CODE_SETTING, PLATFORM_AUDIT_WORKSPACE_ID } from './constants';
import {
  PlanAlreadyExistsException,
  PlanImmutablePublishedVersionException,
  PlanIncompatibleTransitionException,
  PlanInvalidDefinitionException,
  PlanInvalidStateTransitionException,
  PlanNotFoundException,
} from './exceptions/plan-management.exceptions';

interface ITransitionOptions {
  changeType: PlanChangeType;
  event: PlanManagementEvent;
  reason?: string;
  extraFields?: Partial<IPlan>;
}

@Injectable()
export class PlanManagementService implements OnModuleInit {
  private readonly logger = new Logger(PlanManagementService.name);

  constructor(
    private readonly repository: PlanManagementRepository,
    private readonly cache: PlanCacheService,
    private readonly settingsService: SettingsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly eventQueue: PlanManagementEventQueue,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.settingsService.createDefinition('OWNER', {
        key: DEFAULT_PLAN_CODE_SETTING,
        category: 'PLAN_MANAGEMENT',
        label: 'Default plan code for new signups',
        valueType: SettingValueType.STRING,
        allowedScopes: [SettingScope.GLOBAL, SettingScope.ORGANIZATION, SettingScope.WORKSPACE],
        module: PLAN_MANAGEMENT_MODULE,
      } as any);
    } catch (error) {
      if (!(error instanceof SettingDefinitionAlreadyExistsException)) {
        this.logger.warn(`Failed to register plan-management setting '${DEFAULT_PLAN_CODE_SETTING}': ${(error as Error).message}`);
      }
    }
  }

  // ── Create & version ─────────────────────────────────────────────

  async createPlan(userId: string, dto: CreatePlanDto): Promise<IPlan> {
    const existing = await this.repository.findLatestByCode(dto.code);
    if (existing) {
      throw new PlanAlreadyExistsException(dto.code);
    }

    const entitlements = (dto.entitlements ?? []) as IPlanEntitlement[];
    const limits = (dto.limits ?? []) as IPlanLimit[];
    this.assertValidDefinition(entitlements, limits, dto.prices ?? [], dto.supportedBillingCycles);

    const plan = await this.repository.create({
      code: dto.code,
      version: 1,
      name: dto.name,
      description: dto.description ?? null,
      tier: dto.tier,
      tierRank: dto.tierRank ?? 0,
      type: dto.type,
      status: PlanStatus.DRAFT,
      supportedBillingCycles: dto.supportedBillingCycles,
      customBillingCycleDays: dto.customBillingCycleDays ?? null,
      prices: (dto.prices ?? []) as any,
      availableCountries: dto.availableCountries ?? [],
      availableRegions: dto.availableRegions ?? [],
      entitlements: entitlements as any,
      limits: limits as any,
      dependencies: (dto.dependencies ?? null) as any,
      migrationRules: (dto.migrationRules ?? null) as any,
      isSystem: false,
      createdBy: userId,
    });

    await this.repository.createHistory({
      planId: plan.id,
      code: plan.code,
      version: plan.version,
      changeType: PlanChangeType.CREATED,
      toStatus: PlanStatus.DRAFT,
      changedBy: userId,
      snapshot: plan as any,
    });

    await this.recordAudit(userId, 'plan-management.plan.created', AuditActionCategory.CREATE, plan.id);
    await this.publishEvent(PlanManagementEvent.PLAN_CREATED, plan, userId);
    return plan;
  }

  async createNewVersion(code: string, userId: string, dto: PlanReasonDto): Promise<IPlan> {
    const latest = await this.repository.findLatestByCode(code);
    if (!latest) {
      throw new PlanNotFoundException(code);
    }

    const nextVersion = latest.version + 1;
    const draft = await this.repository.create({
      code: latest.code,
      version: nextVersion,
      name: latest.name,
      description: latest.description,
      tier: latest.tier,
      tierRank: latest.tierRank,
      type: latest.type,
      status: PlanStatus.DRAFT,
      supportedBillingCycles: latest.supportedBillingCycles,
      customBillingCycleDays: latest.customBillingCycleDays,
      prices: latest.prices as any,
      availableCountries: latest.availableCountries,
      availableRegions: latest.availableRegions,
      entitlements: latest.entitlements as any,
      limits: latest.limits as any,
      dependencies: latest.dependencies as any,
      migrationRules: latest.migrationRules as any,
      isSystem: latest.isSystem,
      createdBy: userId,
    });

    await this.repository.createHistory({
      planId: draft.id,
      code: draft.code,
      version: draft.version,
      changeType: PlanChangeType.VERSION_CREATED,
      toStatus: PlanStatus.DRAFT,
      reason: dto.reason,
      changedBy: userId,
      snapshot: draft as any,
    });

    await this.recordAudit(userId, 'plan-management.plan.version_created', AuditActionCategory.CREATE, draft.id);
    await this.publishEvent(PlanManagementEvent.PLAN_VERSIONED, draft, userId, { fromVersion: latest.version });
    return draft;
  }

  async updatePlan(id: string, userId: string, dto: UpdatePlanDto): Promise<IPlan> {
    const plan = await this.getPlanOrThrow(id);
    if (plan.status !== PlanStatus.DRAFT) {
      throw new PlanImmutablePublishedVersionException(plan.code, plan.version);
    }

    const entitlements = (dto.entitlements ?? plan.entitlements) as IPlanEntitlement[];
    const limits = (dto.limits ?? plan.limits) as IPlanLimit[];
    const supportedBillingCycles = dto.supportedBillingCycles ?? plan.supportedBillingCycles;
    const prices = dto.prices ?? plan.prices;
    this.assertValidDefinition(entitlements, limits, prices, supportedBillingCycles);

    const updated = await this.repository.update(id, {
      name: dto.name ?? plan.name,
      description: dto.description ?? plan.description,
      tier: dto.tier ?? plan.tier,
      tierRank: dto.tierRank ?? plan.tierRank,
      supportedBillingCycles,
      customBillingCycleDays: dto.customBillingCycleDays ?? plan.customBillingCycleDays,
      prices: prices as any,
      availableCountries: dto.availableCountries ?? plan.availableCountries,
      availableRegions: dto.availableRegions ?? plan.availableRegions,
      entitlements: entitlements as any,
      limits: limits as any,
      dependencies: (dto.dependencies ?? plan.dependencies) as any,
      migrationRules: (dto.migrationRules ?? plan.migrationRules) as any,
      updatedBy: userId,
    });

    await this.repository.createHistory({
      planId: id,
      code: plan.code,
      version: plan.version,
      changeType: PlanChangeType.UPDATED,
      fromStatus: plan.status,
      toStatus: plan.status,
      reason: dto.changeReason,
      changedBy: userId,
      snapshot: updated as any,
    });

    this.cache.invalidateCode(plan.code);
    await this.recordAudit(userId, 'plan-management.plan.updated', AuditActionCategory.UPDATE, id);
    await this.publishEvent(PlanManagementEvent.ENTITLEMENT_CHANGED, updated, userId);
    return updated;
  }

  // ── Lifecycle ────────────────────────────────────────────────────

  async publishPlan(id: string, userId: string, dto: PublishPlanDto): Promise<IPlan> {
    const plan = await this.getPlanOrThrow(id);
    this.assertValidDefinition(plan.entitlements, plan.limits, plan.prices, plan.supportedBillingCycles);

    const effectiveAt = dto.effectiveAt ? new Date(dto.effectiveAt) : new Date();

    return this.transition(plan, PlanStatus.PUBLISHED, userId, {
      changeType: PlanChangeType.PUBLISHED,
      event: PlanManagementEvent.PLAN_PUBLISHED,
      reason: dto.reason,
      extraFields: { effectiveAt, publishedAt: new Date() },
    });
  }

  async deprecatePlan(id: string, userId: string, dto: PlanReasonDto): Promise<IPlan> {
    const plan = await this.getPlanOrThrow(id);
    return this.transition(plan, PlanStatus.DEPRECATED, userId, {
      changeType: PlanChangeType.DEPRECATED,
      event: PlanManagementEvent.PLAN_DEPRECATED,
      reason: dto.reason,
      extraFields: { deprecatedAt: new Date() },
    });
  }

  async archivePlan(id: string, userId: string, dto: PlanReasonDto): Promise<IPlan> {
    const plan = await this.getPlanOrThrow(id);
    return this.transition(plan, PlanStatus.ARCHIVED, userId, {
      changeType: PlanChangeType.ARCHIVED,
      event: PlanManagementEvent.PLAN_ARCHIVED,
      reason: dto.reason,
      extraFields: { archivedAt: new Date() },
    });
  }

  async restorePlan(id: string, userId: string): Promise<IPlan> {
    const plan = await this.getPlanOrThrow(id);
    return this.transition(plan, PlanStatus.DRAFT, userId, {
      changeType: PlanChangeType.RESTORED,
      event: PlanManagementEvent.PLAN_RESTORED,
      extraFields: { archivedAt: null },
    });
  }

  // ── Reads ────────────────────────────────────────────────────────

  async getPlan(id: string): Promise<IPlan> {
    return this.getPlanOrThrow(id);
  }

  async getPlanByCodeAndVersion(code: string, version: number): Promise<IPlan> {
    const plan = await this.repository.findByCodeAndVersion(code, version);
    if (!plan) {
      throw new PlanNotFoundException(`${code}@v${version}`);
    }
    return plan;
  }

  async findAllVersions(code: string): Promise<IPlan[]> {
    return this.repository.findAllVersionsByCode(code);
  }

  async findAllPlans(filter: PlanFilterDto): Promise<PaginatedPlanResponseDto> {
    const [data, total] = await this.repository.findAll(filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getHistory(id: string): Promise<IPlanHistory[]> {
    await this.getPlanOrThrow(id);
    return this.repository.findHistory(id);
  }

  /** The currently-effective published version for a code — the highest-`effectiveAt` PUBLISHED row whose effectiveAt has already passed. */
  async getEffectivePlanVersion(code: string, atDate: Date = new Date()): Promise<IPlan | null> {
    const cached = this.cache.get(code);
    if (cached !== undefined) {
      return cached;
    }
    const effective = await this.repository.findEffectiveByCode(code, atDate);
    this.cache.set(code, effective);
    return effective;
  }

  /** Normalized entitlement/limit metadata for Subscription, Usage, Quota, Billing, License and Feature Flag modules to key their own decisions off. */
  async getEntitlementSnapshot(code: string, version?: number): Promise<IPlanEntitlementSnapshot> {
    const plan = version ? await this.getPlanByCodeAndVersion(code, version) : await this.getEffectivePlanVersion(code);
    if (!plan) {
      throw new PlanNotFoundException(code);
    }

    const entitlementsByKey: Record<string, IPlanEntitlement> = {};
    for (const entitlement of plan.entitlements) {
      const key = [entitlement.module, entitlement.feature, entitlement.capability, entitlement.resource].filter(Boolean).join('.');
      entitlementsByKey[key] = entitlement;
    }

    const limitsByKey: Record<string, IPlanLimit> = {};
    for (const limit of plan.limits) {
      limitsByKey[limit.resourceKey] = limit;
    }

    return {
      code: plan.code,
      version: plan.version,
      status: plan.status,
      type: plan.type,
      tier: plan.tier,
      tierRank: plan.tierRank,
      effectiveAt: plan.effectiveAt,
      prices: plan.prices,
      availableCountries: plan.availableCountries,
      availableRegions: plan.availableRegions,
      entitlements: plan.entitlements,
      limits: plan.limits,
      entitlementsByKey,
      limitsByKey,
    };
  }

  /** Pure query — never mutates a subscription. Subscription Management calls this before acting on a plan change request. */
  async checkCompatibility(fromCode: string, toCode: string): Promise<IPlanCompatibilityResult> {
    const [fromPlan, toPlan] = await Promise.all([this.getEffectivePlanVersion(fromCode), this.getEffectivePlanVersion(toCode)]);

    if (!fromPlan || !toPlan) {
      throw new PlanNotFoundException(!fromPlan ? fromCode : toCode);
    }

    const blocked = fromPlan.migrationRules?.blockedTransitions?.find((b) => b.toCode === toCode);
    if (blocked) {
      return { compatible: false, direction: this.directionFor(fromPlan.tierRank, toPlan.tierRank), reason: blocked.reason };
    }

    if (toPlan.dependencies?.incompatibleWithPlanCodes?.includes(fromCode)) {
      return {
        compatible: false,
        direction: this.directionFor(fromPlan.tierRank, toPlan.tierRank),
        reason: `'${toCode}' is marked incompatible with '${fromCode}'`,
      };
    }

    return { compatible: true, direction: this.directionFor(fromPlan.tierRank, toPlan.tierRank) };
  }

  async assertCompatible(fromCode: string, toCode: string): Promise<void> {
    const result = await this.checkCompatibility(fromCode, toCode);
    if (!result.compatible) {
      throw new PlanIncompatibleTransitionException(fromCode, toCode, result.reason ?? 'incompatible plan transition');
    }
  }

  async getDefaultPlanCode(workspaceId: string): Promise<string | null> {
    const resolved = await this.settingsService.resolve({ workspaceId }, DEFAULT_PLAN_CODE_SETTING);
    return (resolved.value as string) ?? null;
  }

  // ── Private helpers ──────────────────────────────────────────────

  private directionFor(fromTierRank: number, toTierRank: number): PlanTransitionDirection {
    if (toTierRank > fromTierRank) return PlanTransitionDirection.UPGRADE;
    if (toTierRank < fromTierRank) return PlanTransitionDirection.DOWNGRADE;
    return PlanTransitionDirection.LATERAL;
  }

  private assertValidDefinition(
    entitlements: IPlanEntitlement[],
    limits: IPlanLimit[],
    prices: { currency: string; billingCycle: string; amount: number }[],
    supportedBillingCycles: string[],
  ): void {
    const issues: IPlanValidationIssue[] = [
      ...validatePlanEntitlements(entitlements),
      ...validatePlanLimits(limits),
      ...validatePlanPrices(prices as any, supportedBillingCycles),
    ];
    const errors = issues.filter((i) => i.severity === 'ERROR');
    if (errors.length > 0) {
      throw new PlanInvalidDefinitionException(errors.map((e) => e.message).join('; '));
    }
  }

  private async getPlanOrThrow(id: string): Promise<IPlan> {
    const plan = await this.repository.findById(id);
    if (!plan) {
      throw new PlanNotFoundException(id);
    }
    return plan;
  }

  private async transition(plan: IPlan, to: PlanStatus, userId: string, options: ITransitionOptions): Promise<IPlan> {
    if (!PLAN_ALLOWED_TRANSITIONS[plan.status]?.includes(to)) {
      throw new PlanInvalidStateTransitionException(plan.status, to);
    }

    const updated = await this.repository.update(plan.id, {
      status: to,
      ...options.extraFields,
      updatedBy: userId,
    });

    await this.repository.createHistory({
      planId: plan.id,
      code: plan.code,
      version: plan.version,
      changeType: options.changeType,
      fromStatus: plan.status,
      toStatus: to,
      reason: options.reason,
      changedBy: userId,
      snapshot: updated as any,
    });

    this.cache.invalidateCode(plan.code);
    await this.recordAudit(userId, `plan-management.plan.${options.changeType.toLowerCase()}`, AuditActionCategory.UPDATE, plan.id);
    await this.publishEvent(options.event, updated, userId);
    return updated;
  }

  private async recordAudit(actorId: string, action: string, actionCategory: AuditActionCategory, entityId: string): Promise<void> {
    await this.auditLogsService.record({
      workspaceId: PLATFORM_AUDIT_WORKSPACE_ID,
      actorType: ActivityActorType.USER,
      actorId,
      action,
      actionCategory,
      module: PLAN_MANAGEMENT_MODULE,
      entityType: 'Plan',
      entityId,
      outcome: ActivityOutcome.SUCCESS,
    });
  }

  private async publishEvent(event: PlanManagementEvent, plan: IPlan, actorId: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.eventQueue.publish({ event, planId: plan.id, code: plan.code, version: plan.version, actorId, metadata });
  }
}
