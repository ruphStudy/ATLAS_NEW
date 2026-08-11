import { Injectable, Logger } from '@nestjs/common';
import { PlanManagementService } from '@modules/plan-management/plan-management.service';
import { SubscriptionManagementService } from '@modules/subscription-management/subscription-management.service';
import { UsageTrackingService } from '@modules/usage-tracking/usage-tracking.service';
import { RolesPermissionsService } from '@modules/roles-permissions/roles-permissions.service';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory, AuditRiskLevel } from '@modules/audit-logs/interfaces';
import { QuotaManagementRepository } from './quota-management.repository';
import { QuotaManagementEventQueue } from './jobs';
import { buildQuotaScopeKey, buildCandidateScopeKeys } from './scope-key.util';
import {
  CreateQuotaPolicyDto,
  UpdateQuotaPolicyDto,
  QuotaPolicyFilterDto,
  CreateQuotaOverrideDto,
  QuotaOverrideFilterDto,
  QuotaReasonDto,
  PaginatedQuotaPolicyResponseDto,
  PaginatedQuotaOverrideResponseDto,
} from './dto';
import {
  QuotaChangeType,
  QuotaEnforcementState,
  QuotaHistoryEntityType,
  QuotaManagementEvent,
  QuotaOverrideStatus,
  QuotaPolicyStatus,
  QuotaResetSchedule,
  QuotaScopeType,
  IQuotaCheckRequest,
  IQuotaCheckResult,
  IQuotaHistory,
  IQuotaOverride,
  IQuotaPolicy,
  IQuotaState,
} from './interfaces';
import { DEFAULT_GRACE_THRESHOLD, NO_FEATURE_SENTINEL, QUOTA_MANAGE_ROLES, QUOTA_MANAGEMENT_MODULE } from './constants';
import {
  QuotaAccessDeniedException,
  QuotaOverrideInvalidDefinitionException,
  QuotaOverrideNotFoundException,
  QuotaPolicyAlreadyExistsException,
  QuotaPolicyInvalidDefinitionException,
  QuotaPolicyInvalidStateTransitionException,
  QuotaPolicyNotFoundException,
} from './exceptions/quota-management.exceptions';

const POLICY_TRANSITIONS: Record<QuotaPolicyStatus, QuotaPolicyStatus[]> = {
  [QuotaPolicyStatus.ACTIVE]: [QuotaPolicyStatus.DISABLED, QuotaPolicyStatus.ARCHIVED],
  [QuotaPolicyStatus.DISABLED]: [QuotaPolicyStatus.ACTIVE, QuotaPolicyStatus.ARCHIVED],
  [QuotaPolicyStatus.ARCHIVED]: [],
};

interface IPlanLimitLike {
  resourceKey: string;
  unit?: string;
  soft?: number;
  hard?: number;
  graceThreshold?: number;
  overageRule?: unknown;
}

@Injectable()
export class QuotaManagementService {
  private readonly logger = new Logger(QuotaManagementService.name);

  constructor(
    private readonly repository: QuotaManagementRepository,
    private readonly planManagementService: PlanManagementService,
    private readonly subscriptionManagementService: SubscriptionManagementService,
    private readonly usageTrackingService: UsageTrackingService,
    private readonly rolesPermissionsService: RolesPermissionsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly eventQueue: QuotaManagementEventQueue,
  ) {}

  // ══════════════════════════════════════════════════════════════════
  // Policies
  // ══════════════════════════════════════════════════════════════════

  async createPolicy(workspaceId: string, userId: string, userRole: string, dto: CreateQuotaPolicyDto): Promise<IQuotaPolicy> {
    await this.assertCanManage(workspaceId, userId, userRole);
    this.assertValidPolicyDefinition(dto);

    const scopeKey = buildQuotaScopeKey({ scopeType: dto.scopeType, workspaceId, organizationId: dto.organizationId, userId: dto.ownerUserId, planKey: dto.planKey });
    const feature = dto.feature ?? NO_FEATURE_SENTINEL;

    const existing = await this.repository.findPolicyByIdentity(scopeKey, dto.resourceKey, feature);
    if (existing) {
      throw new QuotaPolicyAlreadyExistsException();
    }

    const policy = await this.repository.createPolicy({
      workspaceId: dto.scopeType === QuotaScopeType.WORKSPACE || dto.scopeType === QuotaScopeType.USER ? workspaceId : null,
      organizationId: dto.organizationId ?? null,
      scopeType: dto.scopeType,
      scopeKey,
      resourceKey: dto.resourceKey,
      feature,
      planKey: dto.planKey ?? null,
      unit: dto.unit ?? null,
      softLimit: dto.softLimit ?? null,
      hardLimit: dto.hardLimit ?? null,
      graceThreshold: dto.graceThreshold ?? null,
      overageAllowed: dto.overageAllowed ?? false,
      overageLimit: dto.overageLimit ?? null,
      resetSchedule: dto.resetSchedule ?? QuotaResetSchedule.BILLING_CYCLE,
      customResetIntervalDays: dto.customResetIntervalDays ?? null,
      status: QuotaPolicyStatus.ACTIVE,
      version: 1,
      createdBy: userId,
    });

    await this.recordHistory(QuotaHistoryEntityType.POLICY, policy.id, policy.workspaceId, policy.resourceKey, QuotaChangeType.POLICY_CREATED, null, this.sanitizePolicy(policy), userId);
    await this.recordAudit(workspaceId, userId, 'quota-management.policy.created', AuditActionCategory.CREATE, policy.id);
    await this.publishEvent(QuotaManagementEvent.POLICY_CREATED, policy.id, policy.resourceKey, policy.workspaceId, policy.scopeKey, userId);

    return policy;
  }

  async updatePolicy(id: string, workspaceId: string, userId: string, userRole: string, dto: UpdateQuotaPolicyDto): Promise<IQuotaPolicy> {
    const policy = await this.getPolicyOrThrow(id);
    await this.assertCanManage(workspaceId, userId, userRole);

    const updated = await this.repository.updatePolicy(id, {
      unit: dto.unit ?? policy.unit,
      softLimit: dto.softLimit ?? policy.softLimit,
      hardLimit: dto.hardLimit ?? policy.hardLimit,
      graceThreshold: dto.graceThreshold ?? policy.graceThreshold,
      overageAllowed: dto.overageAllowed ?? policy.overageAllowed,
      overageLimit: dto.overageLimit ?? policy.overageLimit,
      resetSchedule: dto.resetSchedule ?? policy.resetSchedule,
      customResetIntervalDays: dto.customResetIntervalDays ?? policy.customResetIntervalDays,
      version: policy.version + 1,
    });

    await this.recordHistory(QuotaHistoryEntityType.POLICY, id, policy.workspaceId, policy.resourceKey, QuotaChangeType.POLICY_UPDATED, this.sanitizePolicy(policy), this.sanitizePolicy(updated), userId);
    await this.recordAudit(workspaceId, userId, 'quota-management.policy.updated', AuditActionCategory.UPDATE, id);
    await this.publishEvent(QuotaManagementEvent.POLICY_UPDATED, id, updated.resourceKey, updated.workspaceId, updated.scopeKey, userId);
    return updated;
  }

  async enablePolicy(id: string, workspaceId: string, userId: string, userRole: string): Promise<IQuotaPolicy> {
    const policy = await this.getPolicyOrThrow(id);
    await this.assertCanManage(workspaceId, userId, userRole);
    return this.transitionPolicy(policy, QuotaPolicyStatus.ACTIVE, userId, QuotaChangeType.POLICY_ENABLED, QuotaManagementEvent.POLICY_ENABLED);
  }

  async disablePolicy(id: string, workspaceId: string, userId: string, userRole: string): Promise<IQuotaPolicy> {
    const policy = await this.getPolicyOrThrow(id);
    await this.assertCanManage(workspaceId, userId, userRole);
    return this.transitionPolicy(policy, QuotaPolicyStatus.DISABLED, userId, QuotaChangeType.POLICY_DISABLED, QuotaManagementEvent.POLICY_DISABLED);
  }

  async archivePolicy(id: string, workspaceId: string, userId: string, userRole: string): Promise<IQuotaPolicy> {
    const policy = await this.getPolicyOrThrow(id);
    await this.assertCanManage(workspaceId, userId, userRole);
    return this.transitionPolicy(policy, QuotaPolicyStatus.ARCHIVED, userId, QuotaChangeType.POLICY_ARCHIVED, QuotaManagementEvent.POLICY_ARCHIVED);
  }

  async getPolicy(id: string): Promise<IQuotaPolicy> {
    return this.getPolicyOrThrow(id);
  }

  async getPolicyHistory(id: string): Promise<IQuotaHistory[]> {
    await this.getPolicyOrThrow(id);
    return this.repository.findHistory(id);
  }

  async findAllPolicies(workspaceId: string, filter: QuotaPolicyFilterDto): Promise<PaginatedQuotaPolicyResponseDto> {
    const [data, total] = await this.repository.findAllPolicies(workspaceId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ══════════════════════════════════════════════════════════════════
  // Overrides
  // ══════════════════════════════════════════════════════════════════

  async createOverride(policyId: string, workspaceId: string, userId: string, userRole: string, dto: CreateQuotaOverrideDto): Promise<IQuotaOverride> {
    const policy = await this.getPolicyOrThrow(policyId);
    await this.assertCanManage(workspaceId, userId, userRole);

    if (dto.additionalHardLimit === undefined && !dto.expiresAt) {
      throw new QuotaOverrideInvalidDefinitionException('An override must set additionalHardLimit and/or expiresAt');
    }

    const override = await this.repository.createOverride({
      policyId,
      // Mirrors the policy's OWN scope exactly (never falls back to the acting admin's workspace) —
      // `checkQuota` looks up overrides by the same `scopeKey` that resolved the policy, so a mismatch
      // here would silently apply the override to the wrong (or every) tenant.
      workspaceId: policy.workspaceId,
      organizationId: policy.organizationId,
      scopeKey: policy.scopeKey,
      resourceKey: policy.resourceKey,
      feature: policy.feature,
      additionalHardLimit: dto.additionalHardLimit ?? null,
      reason: dto.reason,
      status: QuotaOverrideStatus.ACTIVE,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      createdBy: userId,
    });

    await this.recordHistory(QuotaHistoryEntityType.OVERRIDE, override.id, override.workspaceId, override.resourceKey, QuotaChangeType.OVERRIDE_CREATED, null, this.sanitizeOverride(override), userId, dto.reason);
    await this.recordAudit(workspaceId, userId, 'quota-management.override.created', AuditActionCategory.CREATE, override.id, AuditRiskLevel.SUSPICIOUS);
    await this.publishEvent(QuotaManagementEvent.OVERRIDE_CREATED, override.id, override.resourceKey, override.workspaceId, override.scopeKey, userId, { reason: dto.reason });

    return override;
  }

  async revokeOverride(id: string, workspaceId: string, userId: string, userRole: string, dto: QuotaReasonDto): Promise<IQuotaOverride> {
    const override = await this.getVisibleOverrideOrThrow(id, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);

    const updated = await this.repository.updateOverride(id, { status: QuotaOverrideStatus.REVOKED });

    await this.recordHistory(QuotaHistoryEntityType.OVERRIDE, id, override.workspaceId, override.resourceKey, QuotaChangeType.OVERRIDE_REVOKED, this.sanitizeOverride(override), this.sanitizeOverride(updated), userId, dto.reason);
    await this.recordAudit(workspaceId, userId, 'quota-management.override.revoked', AuditActionCategory.UPDATE, id, AuditRiskLevel.SUSPICIOUS);
    await this.publishEvent(QuotaManagementEvent.OVERRIDE_REVOKED, id, override.resourceKey, override.workspaceId, override.scopeKey, userId, { reason: dto.reason });
    return updated;
  }

  async getOverride(id: string, workspaceId: string): Promise<IQuotaOverride> {
    return this.getVisibleOverrideOrThrow(id, workspaceId);
  }

  async findAllOverrides(workspaceId: string, filter: QuotaOverrideFilterDto): Promise<PaginatedQuotaOverrideResponseDto> {
    const [data, total] = await this.repository.findAllOverrides(workspaceId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ══════════════════════════════════════════════════════════════════
  // Enforcement — the centralized, configuration-driven evaluation engine
  // ══════════════════════════════════════════════════════════════════

  async checkQuota(request: IQuotaCheckRequest): Promise<IQuotaCheckResult> {
    const resourceKey = request.resourceKey;
    const feature = request.feature ?? NO_FEATURE_SENTINEL;
    const requestedQuantity = request.requestedQuantity ?? 1;

    const planKey = await this.resolvePlanKey(request.workspaceId);
    const scopeKeys = buildCandidateScopeKeys(request.workspaceId, request.organizationId, request.userId, planKey ?? undefined);

    const policies = await this.repository.findApplicablePolicies(scopeKeys, resourceKey, feature);
    const policy = this.pickMostSpecific(policies, scopeKeys);
    const resolvedScopeKey = policy?.scopeKey ?? `WORKSPACE:${request.workspaceId}`;

    let hardLimit = policy?.hardLimit ?? null;
    const softLimit = policy?.softLimit ?? null;
    const graceThreshold = policy?.graceThreshold ?? DEFAULT_GRACE_THRESHOLD;
    const overageAllowed = policy?.overageAllowed ?? false;
    const overageLimit = policy?.overageLimit ?? null;

    if (!policy) {
      const planLimit = await this.fetchPlanLimit(planKey, resourceKey);
      if (planLimit) {
        hardLimit = planLimit.hard ?? null;
      }
    }

    const state = await this.getOrCreateState(policy, resolvedScopeKey, request.workspaceId, request.organizationId, resourceKey, feature);

    const overrides = await this.repository.findActiveOverrides(resolvedScopeKey, resourceKey, feature);
    const additionalLimit = overrides.reduce((sum, o) => sum + (o.additionalHardLimit ?? 0), 0);
    if (hardLimit !== null) {
      hardLimit += additionalLimit;
    }

    const periodBounds = this.resolveCheckPeriodBounds(policy?.resetSchedule ?? QuotaResetSchedule.BILLING_CYCLE, state);
    const consumed = await this.usageTrackingService.getCurrentUsage(request.workspaceId, resourceKey, periodBounds.periodStart, periodBounds.periodEnd);

    const projected = consumed + requestedQuantity;
    let newState = QuotaEnforcementState.OK;
    let reason: string | undefined;

    if (hardLimit !== null) {
      const blockCeiling = overageAllowed ? hardLimit + (overageLimit ?? Number.POSITIVE_INFINITY) : hardLimit;
      if (projected > blockCeiling) {
        newState = QuotaEnforcementState.BLOCKED;
        reason = `Requested quantity would exceed the allowed limit for '${resourceKey}'`;
      } else if (projected > hardLimit) {
        newState = QuotaEnforcementState.EXCEEDED;
        reason = `'${resourceKey}' usage is over its hard limit (overage allowed)`;
      } else if ((softLimit !== null && projected > softLimit) || projected > hardLimit * graceThreshold) {
        newState = QuotaEnforcementState.WARNING;
        reason = `'${resourceKey}' usage is approaching its limit`;
      }
    }

    const remaining = hardLimit === null ? null : Math.max(0, hardLimit - consumed);
    const overage = hardLimit === null ? 0 : Math.max(0, consumed - hardLimit);

    await this.applyStateTransition(state, newState, consumed, hardLimit, resourceKey, feature, request.workspaceId, resolvedScopeKey);

    return { allowed: newState !== QuotaEnforcementState.BLOCKED, state: newState, resourceKey, feature, consumed, limit: hardLimit, remaining, overage, reason };
  }

  // ══════════════════════════════════════════════════════════════════
  // Scheduler-callable sweep (no active scheduler wired — mirrors every other module this session)
  // ══════════════════════════════════════════════════════════════════

  async processSweep(): Promise<{ overridesExpired: number; statesReset: number }> {
    const now = new Date();

    const expiredOverrides = await this.repository.findExpiredActiveOverrides(now);
    for (const override of expiredOverrides) {
      const updated = await this.repository.updateOverride(override.id, { status: QuotaOverrideStatus.EXPIRED });
      await this.recordHistory(QuotaHistoryEntityType.OVERRIDE, override.id, override.workspaceId, override.resourceKey, QuotaChangeType.OVERRIDE_EXPIRED, this.sanitizeOverride(override), this.sanitizeOverride(updated), 'system', 'Override expiry date reached');
      await this.publishEvent(QuotaManagementEvent.OVERRIDE_EXPIRED, override.id, override.resourceKey, override.workspaceId, override.scopeKey);
    }

    const dueStates = await this.repository.findStatesDueForReset(now);
    for (const state of dueStates) {
      const policy = state.policyId ? await this.repository.findPolicyById(state.policyId) : null;
      const bounds = this.computePeriodBounds(policy?.resetSchedule ?? QuotaResetSchedule.CALENDAR_MONTHLY, policy?.customResetIntervalDays, now);
      const updated = await this.repository.updateState(state.id, {
        state: QuotaEnforcementState.OK,
        consumedAtLastCheck: 0,
        currentPeriodStart: bounds.start,
        currentPeriodEnd: bounds.end,
        lastResetAt: now,
        nextResetAt: bounds.end,
        blockedAt: null,
      });
      await this.recordHistory(QuotaHistoryEntityType.STATE, state.id, state.workspaceId, state.resourceKey, QuotaChangeType.QUOTA_RESET, this.sanitizeState(state), this.sanitizeState(updated), 'system', 'Scheduled reset');
      await this.publishEvent(QuotaManagementEvent.QUOTA_RESET, state.id, state.resourceKey, state.workspaceId, state.scopeKey);
    }

    this.logger.log(`Quota sweep: ${expiredOverrides.length} overrides expired, ${dueStates.length} states reset`);
    return { overridesExpired: expiredOverrides.length, statesReset: dueStates.length };
  }

  // ══════════════════════════════════════════════════════════════════
  // Private — resolution helpers
  // ══════════════════════════════════════════════════════════════════

  private pickMostSpecific<T extends { scopeKey: string }>(candidates: T[], scopeKeysOrdered: string[]): T | undefined {
    let winner: T | undefined;
    let winnerRank = -1;
    for (const candidate of candidates) {
      const rank = scopeKeysOrdered.indexOf(candidate.scopeKey);
      if (rank > winnerRank) {
        winner = candidate;
        winnerRank = rank;
      }
    }
    return winner;
  }

  private async resolvePlanKey(workspaceId: string): Promise<string | null> {
    try {
      const reference = await this.subscriptionManagementService.getEntitlementReference(workspaceId);
      return reference?.planKey ?? null;
    } catch (error) {
      this.logger.warn(`Failed to resolve plan for workspace '${workspaceId}': ${(error as Error).message}`);
      return null;
    }
  }

  private async fetchPlanLimit(planKey: string | null, resourceKey: string): Promise<IPlanLimitLike | null> {
    if (!planKey) return null;
    try {
      const snapshot = await this.planManagementService.getEntitlementSnapshot(planKey);
      return (snapshot.limitsByKey as Record<string, IPlanLimitLike>)[resourceKey] ?? null;
    } catch (error) {
      this.logger.warn(`Failed to fetch plan limit for '${planKey}'/'${resourceKey}': ${(error as Error).message}`);
      return null;
    }
  }

  private async getOrCreateState(
    policy: IQuotaPolicy | undefined,
    scopeKey: string,
    workspaceId: string,
    organizationId: string | undefined,
    resourceKey: string,
    feature: string,
  ): Promise<IQuotaState> {
    const existing = await this.repository.findState(scopeKey, resourceKey, feature);
    if (existing) return existing;

    const schedule = policy?.resetSchedule ?? QuotaResetSchedule.BILLING_CYCLE;
    let currentPeriodStart: Date | null = null;
    let currentPeriodEnd: Date | null = null;
    let nextResetAt: Date | null = null;

    if (schedule !== QuotaResetSchedule.BILLING_CYCLE && schedule !== QuotaResetSchedule.NEVER) {
      const bounds = this.computePeriodBounds(schedule, policy?.customResetIntervalDays, new Date());
      currentPeriodStart = bounds.start;
      currentPeriodEnd = bounds.end;
      nextResetAt = bounds.end;
    }

    return this.repository.createState({
      policyId: policy?.id ?? null,
      workspaceId,
      organizationId: organizationId ?? null,
      scopeKey,
      resourceKey,
      feature,
      state: QuotaEnforcementState.OK,
      consumedAtLastCheck: 0,
      currentPeriodStart,
      currentPeriodEnd,
      nextResetAt,
    });
  }

  /** BILLING_CYCLE and NEVER delegate entirely to Usage Tracking's own period resolution (undefined bounds); every other schedule uses the bounds Quota Management itself computed and stored on the state row. */
  private resolveCheckPeriodBounds(schedule: QuotaResetSchedule, state: IQuotaState): { periodStart?: Date; periodEnd?: Date } {
    if (schedule === QuotaResetSchedule.BILLING_CYCLE || schedule === QuotaResetSchedule.NEVER) {
      return {};
    }
    return { periodStart: state.currentPeriodStart ?? undefined, periodEnd: state.currentPeriodEnd ?? undefined };
  }

  private computePeriodBounds(schedule: QuotaResetSchedule, customIntervalDays: number | null | undefined, reference: Date): { start: Date; end: Date } {
    const dayMs = 24 * 60 * 60 * 1000;
    switch (schedule) {
      case QuotaResetSchedule.CALENDAR_DAILY: {
        const start = new Date(reference);
        start.setHours(0, 0, 0, 0);
        return { start, end: new Date(start.getTime() + dayMs) };
      }
      case QuotaResetSchedule.CALENDAR_WEEKLY: {
        const start = new Date(reference);
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - start.getDay());
        return { start, end: new Date(start.getTime() + 7 * dayMs) };
      }
      case QuotaResetSchedule.CALENDAR_MONTHLY: {
        const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
        const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 1);
        return { start, end };
      }
      case QuotaResetSchedule.CUSTOM: {
        const days = customIntervalDays ?? 30;
        const start = new Date(reference);
        return { start, end: new Date(start.getTime() + days * dayMs) };
      }
      default:
        return { start: reference, end: new Date(reference.getTime() + 30 * dayMs) };
    }
  }

  private async applyStateTransition(
    state: IQuotaState,
    newState: QuotaEnforcementState,
    consumed: number,
    limit: number | null,
    resourceKey: string,
    feature: string,
    workspaceId: string,
    scopeKey: string,
  ): Promise<void> {
    const previousState = state.state;
    const updated = await this.repository.updateState(state.id, {
      state: newState,
      consumedAtLastCheck: consumed,
      limitAtLastCheck: limit,
      lastEvaluatedAt: new Date(),
      blockedAt: newState === QuotaEnforcementState.BLOCKED ? (state.blockedAt ?? new Date()) : null,
    });

    if (newState === previousState) {
      return;
    }

    const changeType =
      newState === QuotaEnforcementState.WARNING ? QuotaChangeType.STATE_WARNING
      : newState === QuotaEnforcementState.EXCEEDED ? QuotaChangeType.STATE_EXCEEDED
      : newState === QuotaEnforcementState.BLOCKED ? QuotaChangeType.STATE_BLOCKED
      : QuotaChangeType.STATE_RESTORED;

    const event =
      newState === QuotaEnforcementState.WARNING ? QuotaManagementEvent.QUOTA_WARNING
      : newState === QuotaEnforcementState.EXCEEDED ? QuotaManagementEvent.QUOTA_EXCEEDED
      : newState === QuotaEnforcementState.BLOCKED ? QuotaManagementEvent.QUOTA_BLOCKED
      : QuotaManagementEvent.QUOTA_RESTORED;

    await this.recordHistory(QuotaHistoryEntityType.STATE, state.id, workspaceId, resourceKey, changeType, previousState, newState, 'system');

    const riskLevel = newState === QuotaEnforcementState.BLOCKED ? AuditRiskLevel.HIGH_RISK : newState === QuotaEnforcementState.EXCEEDED ? AuditRiskLevel.SUSPICIOUS : undefined;
    await this.recordAudit(workspaceId, 'system', `quota-management.state.${changeType.toLowerCase()}`, AuditActionCategory.OTHER, state.id, riskLevel);
    await this.publishEvent(event, state.id, resourceKey, workspaceId, scopeKey, undefined, { feature, previousState, newState, consumed, limit });
  }

  // ══════════════════════════════════════════════════════════════════
  // Private — shared helpers
  // ══════════════════════════════════════════════════════════════════

  private async transitionPolicy(
    policy: IQuotaPolicy,
    to: QuotaPolicyStatus,
    userId: string,
    changeType: QuotaChangeType,
    event: QuotaManagementEvent,
  ): Promise<IQuotaPolicy> {
    if (!POLICY_TRANSITIONS[policy.status]?.includes(to)) {
      throw new QuotaPolicyInvalidStateTransitionException(policy.status, to);
    }
    const updated = await this.repository.updatePolicy(policy.id, { status: to });
    await this.recordHistory(QuotaHistoryEntityType.POLICY, policy.id, policy.workspaceId, policy.resourceKey, changeType, policy.status, to, userId);
    await this.publishEvent(event, policy.id, policy.resourceKey, updated.workspaceId, updated.scopeKey, userId);
    return updated;
  }

  private assertValidPolicyDefinition(dto: CreateQuotaPolicyDto): void {
    if (dto.scopeType === QuotaScopeType.ORGANIZATION && !dto.organizationId) {
      throw new QuotaPolicyInvalidDefinitionException('ORGANIZATION-scoped policies require organizationId');
    }
    if (dto.scopeType === QuotaScopeType.PLAN && !dto.planKey) {
      throw new QuotaPolicyInvalidDefinitionException('PLAN-scoped policies require planKey');
    }
    if (dto.scopeType === QuotaScopeType.USER && !dto.ownerUserId) {
      throw new QuotaPolicyInvalidDefinitionException('USER-scoped policies require ownerUserId');
    }
    if (dto.softLimit !== undefined && dto.hardLimit !== undefined && dto.softLimit > dto.hardLimit) {
      throw new QuotaPolicyInvalidDefinitionException('softLimit cannot exceed hardLimit');
    }
    if (dto.resetSchedule === QuotaResetSchedule.CUSTOM && !dto.customResetIntervalDays) {
      throw new QuotaPolicyInvalidDefinitionException('CUSTOM reset schedule requires customResetIntervalDays');
    }
  }

  private async assertCanManage(workspaceId: string, userId: string, userRole: string): Promise<void> {
    if (QUOTA_MANAGE_ROLES.includes(userRole)) {
      return;
    }
    const hasGranularRole = await this.rolesPermissionsService.userHasActiveRole(workspaceId, userId, 'ADMIN');
    if (!hasGranularRole) {
      throw new QuotaAccessDeniedException();
    }
  }

  private async getPolicyOrThrow(id: string): Promise<IQuotaPolicy> {
    const policy = await this.repository.findPolicyById(id);
    if (!policy) {
      throw new QuotaPolicyNotFoundException(id);
    }
    return policy;
  }

  private async getVisibleOverrideOrThrow(id: string, workspaceId: string, organizationId?: string): Promise<IQuotaOverride> {
    const override = await this.repository.findOverrideById(id);
    const visible = !!override && (override.workspaceId === workspaceId || (!!organizationId && override.organizationId === organizationId));
    if (!override || !visible) {
      throw new QuotaOverrideNotFoundException(id);
    }
    return override;
  }

  private sanitizePolicy(policy: IQuotaPolicy): Record<string, unknown> {
    return { ...policy };
  }

  private sanitizeOverride(override: IQuotaOverride): Record<string, unknown> {
    return { ...override };
  }

  private sanitizeState(state: IQuotaState): Record<string, unknown> {
    return { ...state };
  }

  private async recordHistory(
    entityType: QuotaHistoryEntityType,
    entityId: string,
    workspaceId: string | null,
    resourceKey: string,
    changeType: QuotaChangeType,
    fromValue: unknown,
    toValue: unknown,
    changedBy: string | null,
    reason?: string,
  ): Promise<void> {
    await this.repository.createHistory({
      entityType,
      entityId,
      workspaceId,
      resourceKey,
      changeType,
      fromValue: fromValue as any,
      toValue: toValue as any,
      reason: reason ?? null,
      changedBy: changedBy === 'system' ? null : changedBy,
    });
  }

  private async recordAudit(
    workspaceId: string,
    actorId: string,
    action: string,
    actionCategory: AuditActionCategory,
    entityId: string,
    riskLevel?: AuditRiskLevel,
  ): Promise<void> {
    await this.auditLogsService.record({
      workspaceId,
      actorType: actorId === 'system' ? ActivityActorType.SYSTEM : ActivityActorType.USER,
      actorId: actorId === 'system' ? undefined : actorId,
      action,
      actionCategory,
      module: QUOTA_MANAGEMENT_MODULE,
      entityType: 'Quota',
      entityId,
      outcome: ActivityOutcome.SUCCESS,
      riskLevel,
    });
  }

  private async publishEvent(
    event: QuotaManagementEvent,
    entityId: string,
    resourceKey: string,
    workspaceId?: string | null,
    scopeKey?: string,
    actorId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.eventQueue.publish({ event, entityId, resourceKey, workspaceId, scopeKey, actorId, metadata });
  }
}
