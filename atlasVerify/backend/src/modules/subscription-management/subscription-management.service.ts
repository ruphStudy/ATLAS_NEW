import { Injectable, Logger } from '@nestjs/common';
import { WorkspaceRepository } from '@modules/workspace/workspace.repository';
import { RolesPermissionsService } from '@modules/roles-permissions/roles-permissions.service';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory, AuditRiskLevel } from '@modules/audit-logs/interfaces';
import { SubscriptionManagementRepository } from './subscription-management.repository';
import { SubscriptionCacheService } from './subscription-cache.service';
import { SubscriptionManagementEventQueue } from './jobs';
import { buildSubscriptionScopeKey } from './scope-key.util';
import { computeNextPeriodEnd } from './billing-cycle.util';
import {
  CreateSubscriptionDto,
  ChangePlanDto,
  CancelSubscriptionDto,
  SubscriptionReasonDto,
  AdminOverrideDto,
  SubscriptionFilterDto,
  PaginatedSubscriptionResponseDto,
} from './dto';
import {
  ISubscription,
  ISubscriptionEntitlementReference,
  ISubscriptionHistory,
  IProrationReference,
  IScheduledChange,
  SubscriptionScope,
  SubscriptionStatus,
  SubscriptionType,
  SubscriptionBillingCycle,
  SubscriptionChangeType,
  SubscriptionManagementEvent,
  PlanChangeEffective,
} from './interfaces';
import {
  SUBSCRIPTION_ADMIN_OVERRIDE_ROLES,
  SUBSCRIPTION_ALLOWED_TRANSITIONS,
  SUBSCRIPTION_MANAGEMENT_MODULE,
  SUBSCRIPTION_ORG_SCOPE_ROLES,
  SUBSCRIPTION_WORKSPACE_SCOPE_ROLES,
  DEFAULT_TRIAL_DAYS,
} from './constants';
import {
  SubscriptionAccessDeniedException,
  SubscriptionAdminOverrideReasonRequiredException,
  SubscriptionDuplicateActiveException,
  SubscriptionInvalidDefinitionException,
  SubscriptionInvalidStateTransitionException,
  SubscriptionNotFoundException,
} from './exceptions/subscription-management.exceptions';

interface ITransitionOptions {
  changeType: SubscriptionChangeType;
  event: SubscriptionManagementEvent;
  reason?: string;
  extraFields?: Partial<ISubscription>;
}

@Injectable()
export class SubscriptionManagementService {
  private readonly logger = new Logger(SubscriptionManagementService.name);

  constructor(
    private readonly repository: SubscriptionManagementRepository,
    private readonly cache: SubscriptionCacheService,
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly rolesPermissionsService: RolesPermissionsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly eventQueue: SubscriptionManagementEventQueue,
  ) {}

  // ── Create ───────────────────────────────────────────────────────

  async createSubscription(workspaceId: string, userId: string, userRole: string, dto: CreateSubscriptionDto): Promise<ISubscription> {
    await this.assertScopeRole(dto.scope, workspaceId, userId, userRole);

    if (dto.billingCycle === SubscriptionBillingCycle.CUSTOM && !dto.customBillingCycleDays) {
      throw new SubscriptionInvalidDefinitionException('customBillingCycleDays is required when billingCycle is CUSTOM');
    }

    let organizationId: string | null = dto.organizationId ?? null;
    let scopeWorkspaceId: string | null = null;

    if (dto.scope === SubscriptionScope.WORKSPACE) {
      scopeWorkspaceId = workspaceId;
      if (!organizationId) {
        const workspace = await this.workspaceRepository.findById(workspaceId);
        organizationId = workspace?.organizationId ?? null;
      }
    } else if (!organizationId) {
      throw new SubscriptionInvalidDefinitionException('organizationId is required when scope is ORGANIZATION');
    }

    const scopeKey = buildSubscriptionScopeKey({ scope: dto.scope, organizationId, workspaceId: scopeWorkspaceId });

    if (!dto.allowMultipleActive) {
      const existing = await this.repository.findNonTerminalByScopeKey(scopeKey);
      if (existing) {
        throw new SubscriptionDuplicateActiveException(scopeKey);
      }
    }

    const now = new Date();
    const isTrial = dto.type === SubscriptionType.TRIAL;
    const trialStartAt = isTrial ? now : null;
    const trialEndAt = isTrial ? this.addDays(now, dto.trialDays ?? DEFAULT_TRIAL_DAYS) : null;
    const status = isTrial ? SubscriptionStatus.TRIAL : SubscriptionStatus.ACTIVE;
    const currentPeriodEnd = isTrial && trialEndAt ? trialEndAt : computeNextPeriodEnd(now, dto.billingCycle, dto.customBillingCycleDays);
    const autoRenew = dto.autoRenew ?? true;

    const subscription = await this.repository.create({
      scope: dto.scope,
      organizationId,
      workspaceId: scopeWorkspaceId,
      scopeKey,
      type: dto.type,
      planKey: dto.planKey,
      billingCycle: dto.billingCycle,
      customBillingCycleDays: dto.customBillingCycleDays ?? null,
      status,
      trialStartAt,
      trialEndAt,
      startAt: now,
      currentPeriodStart: now,
      currentPeriodEnd,
      renewalDate: autoRenew ? currentPeriodEnd : null,
      gracePeriodDays: dto.gracePeriodDays ?? 0,
      autoRenew,
      allowMultipleActive: dto.allowMultipleActive ?? false,
      metadata: dto.metadata ?? {},
      version: 1,
      createdBy: userId,
    });

    await this.repository.createHistory({
      subscriptionId: subscription.id,
      scopeKey,
      changeType: SubscriptionChangeType.CREATED,
      toStatus: status,
      toPlanKey: dto.planKey,
      changedBy: userId,
      snapshot: subscription as any,
    });

    this.invalidateCacheFor(subscription);
    await this.recordAudit(workspaceId, userId, 'subscription-management.subscription.created', AuditActionCategory.CREATE, subscription.id);
    await this.publishEvent(SubscriptionManagementEvent.SUBSCRIPTION_CREATED, subscription, userId);
    return subscription;
  }

  // ── Lifecycle ────────────────────────────────────────────────────

  async activateSubscription(id: string, workspaceId: string, userId: string, userRole: string): Promise<ISubscription> {
    const subscription = await this.getSubscriptionOrThrow(id);
    await this.assertCanManage(subscription, workspaceId, userId, userRole);

    const changeType = subscription.status === SubscriptionStatus.TRIAL ? SubscriptionChangeType.TRIAL_CONVERTED : SubscriptionChangeType.ACTIVATED;
    const now = new Date();
    const fromTrial = subscription.status === SubscriptionStatus.TRIAL;

    return this.transition(subscription, SubscriptionStatus.ACTIVE, userId, {
      changeType,
      event: SubscriptionManagementEvent.SUBSCRIPTION_ACTIVATED,
      extraFields: fromTrial
        ? {
            currentPeriodStart: now,
            currentPeriodEnd: computeNextPeriodEnd(now, subscription.billingCycle, subscription.customBillingCycleDays),
            renewalDate: subscription.autoRenew ? computeNextPeriodEnd(now, subscription.billingCycle, subscription.customBillingCycleDays) : null,
          }
        : { pausedAt: null, pauseReason: null, suspendedAt: null, suspensionReason: null, gracePeriodEndsAt: null },
    });
  }

  async pauseSubscription(id: string, workspaceId: string, userId: string, userRole: string, dto: SubscriptionReasonDto): Promise<ISubscription> {
    const subscription = await this.getSubscriptionOrThrow(id);
    await this.assertCanManage(subscription, workspaceId, userId, userRole);

    return this.transition(subscription, SubscriptionStatus.PAUSED, userId, {
      changeType: SubscriptionChangeType.PAUSED,
      event: SubscriptionManagementEvent.SUBSCRIPTION_PAUSED,
      reason: dto.reason,
      extraFields: { pausedAt: new Date(), pauseReason: dto.reason ?? null },
    });
  }

  async resumeSubscription(id: string, workspaceId: string, userId: string, userRole: string): Promise<ISubscription> {
    const subscription = await this.getSubscriptionOrThrow(id);
    await this.assertCanManage(subscription, workspaceId, userId, userRole);

    return this.transition(subscription, SubscriptionStatus.ACTIVE, userId, {
      changeType: SubscriptionChangeType.RESUMED,
      event: SubscriptionManagementEvent.SUBSCRIPTION_RESUMED,
      extraFields: { pausedAt: null, pauseReason: null },
    });
  }

  async suspendSubscription(id: string, workspaceId: string, userId: string, userRole: string, dto: SubscriptionReasonDto): Promise<ISubscription> {
    const subscription = await this.getSubscriptionOrThrow(id);
    await this.assertCanManage(subscription, workspaceId, userId, userRole);

    return this.transition(subscription, SubscriptionStatus.SUSPENDED, userId, {
      changeType: SubscriptionChangeType.SUSPENDED,
      event: SubscriptionManagementEvent.SUBSCRIPTION_SUSPENDED,
      reason: dto.reason,
      extraFields: { suspendedAt: new Date(), suspensionReason: dto.reason ?? null },
    });
  }

  async markPastDue(id: string, workspaceId: string, userId: string, userRole: string): Promise<ISubscription> {
    const subscription = await this.getSubscriptionOrThrow(id);
    await this.assertCanManage(subscription, workspaceId, userId, userRole);

    const gracePeriodEndsAt = this.addDays(new Date(), subscription.gracePeriodDays || 0);
    return this.transition(subscription, SubscriptionStatus.PAST_DUE, userId, {
      changeType: SubscriptionChangeType.PAST_DUE,
      event: SubscriptionManagementEvent.SUBSCRIPTION_PAST_DUE,
      extraFields: { gracePeriodEndsAt },
    });
  }

  async cancelSubscription(id: string, workspaceId: string, userId: string, userRole: string, dto: CancelSubscriptionDto): Promise<ISubscription> {
    const subscription = await this.getSubscriptionOrThrow(id);
    await this.assertCanManage(subscription, workspaceId, userId, userRole);

    if (dto.immediate) {
      const now = new Date();
      return this.transition(subscription, SubscriptionStatus.CANCELLED, userId, {
        changeType: SubscriptionChangeType.CANCELLED,
        event: SubscriptionManagementEvent.SUBSCRIPTION_CANCELLED,
        reason: dto.reason,
        extraFields: { endAt: now, cancelledAt: now, cancellationReason: dto.reason ?? null, autoRenew: false, cancelAtPeriodEnd: false },
      });
    }

    const updated = await this.repository.update(id, {
      cancelAtPeriodEnd: true,
      cancellationReason: dto.reason ?? null,
      autoRenew: false,
      version: subscription.version + 1,
    });

    await this.repository.createHistory({
      subscriptionId: id,
      scopeKey: subscription.scopeKey,
      changeType: SubscriptionChangeType.CANCELLED,
      fromStatus: subscription.status,
      toStatus: subscription.status,
      reason: dto.reason ? `Scheduled for period end: ${dto.reason}` : 'Scheduled for period end',
      changedBy: userId,
      snapshot: updated as any,
    });

    this.invalidateCacheFor(updated);
    await this.recordAudit(workspaceId, userId, 'subscription-management.subscription.cancel_scheduled', AuditActionCategory.UPDATE, id);
    await this.publishEvent(SubscriptionManagementEvent.SUBSCRIPTION_CHANGED, updated, userId, { cancelAtPeriodEnd: true });
    return updated;
  }

  // ── Plan changes ─────────────────────────────────────────────────

  async changePlan(id: string, workspaceId: string, userId: string, userRole: string, dto: ChangePlanDto): Promise<ISubscription> {
    const subscription = await this.getSubscriptionOrThrow(id);
    await this.assertCanManage(subscription, workspaceId, userId, userRole);

    if (![SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL, SubscriptionStatus.PAST_DUE].includes(subscription.status)) {
      throw new SubscriptionInvalidStateTransitionException(subscription.status, 'PLAN_CHANGE');
    }

    const now = new Date();
    const toBillingCycle = dto.toBillingCycle ?? subscription.billingCycle;

    if (dto.effective === PlanChangeEffective.IMMEDIATE) {
      const prorationReference: IProrationReference = {
        fromPlanKey: subscription.planKey,
        toPlanKey: dto.toPlanKey,
        fromBillingCycle: subscription.billingCycle,
        toBillingCycle,
        changeType: dto.changeType,
        effectiveAt: now.toISOString(),
        currentPeriodStart: subscription.currentPeriodStart.toISOString(),
        currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
      };

      const updated = await this.repository.update(id, {
        planKey: dto.toPlanKey,
        billingCycle: toBillingCycle,
        prorationReference: prorationReference as any,
        scheduledChange: null as any,
        version: subscription.version + 1,
      });

      await this.repository.createHistory({
        subscriptionId: id,
        scopeKey: subscription.scopeKey,
        changeType: SubscriptionChangeType.PLAN_CHANGED,
        fromStatus: subscription.status,
        toStatus: subscription.status,
        fromPlanKey: subscription.planKey,
        toPlanKey: dto.toPlanKey,
        reason: dto.reason,
        changedBy: userId,
        snapshot: updated as any,
      });

      this.invalidateCacheFor(updated);
      await this.recordAudit(workspaceId, userId, 'subscription-management.subscription.plan_changed', AuditActionCategory.UPDATE, id);
      await this.publishEvent(SubscriptionManagementEvent.SUBSCRIPTION_CHANGED, updated, userId, { effective: 'IMMEDIATE' });
      return updated;
    }

    const scheduledChange: IScheduledChange = {
      toPlanKey: dto.toPlanKey,
      toBillingCycle: dto.toBillingCycle,
      changeType: dto.changeType,
      requestedBy: userId,
      requestedAt: now.toISOString(),
      reason: dto.reason,
    };

    const updated = await this.repository.update(id, {
      scheduledChange: scheduledChange as any,
      version: subscription.version + 1,
    });

    await this.repository.createHistory({
      subscriptionId: id,
      scopeKey: subscription.scopeKey,
      changeType: SubscriptionChangeType.PLAN_CHANGED,
      fromStatus: subscription.status,
      toStatus: subscription.status,
      fromPlanKey: subscription.planKey,
      toPlanKey: dto.toPlanKey,
      reason: dto.reason ? `Scheduled for period end: ${dto.reason}` : 'Scheduled for period end',
      changedBy: userId,
      snapshot: updated as any,
    });

    this.invalidateCacheFor(updated);
    await this.recordAudit(workspaceId, userId, 'subscription-management.subscription.plan_change_scheduled', AuditActionCategory.UPDATE, id);
    await this.publishEvent(SubscriptionManagementEvent.SUBSCRIPTION_CHANGED, updated, userId, { effective: 'PERIOD_END' });
    return updated;
  }

  // ── Admin override ───────────────────────────────────────────────

  async adminOverride(id: string, workspaceId: string, userId: string, userRole: string, dto: AdminOverrideDto): Promise<ISubscription> {
    if (!dto.reason?.trim()) {
      throw new SubscriptionAdminOverrideReasonRequiredException();
    }
    if (!SUBSCRIPTION_ADMIN_OVERRIDE_ROLES.includes(userRole)) {
      throw new SubscriptionAccessDeniedException();
    }

    const subscription = await this.getSubscriptionOrThrow(id);
    await this.assertVisible(subscription, workspaceId);

    const now = new Date();
    const extraFields: Partial<ISubscription> = { isAdminOverride: true, adminOverrideReason: dto.reason };
    if (dto.toStatus === SubscriptionStatus.CANCELLED) {
      Object.assign(extraFields, { endAt: now, cancelledAt: now, cancellationReason: dto.reason });
    } else if (dto.toStatus === SubscriptionStatus.SUSPENDED) {
      Object.assign(extraFields, { suspendedAt: now, suspensionReason: dto.reason });
    } else if (dto.toStatus === SubscriptionStatus.PAUSED) {
      Object.assign(extraFields, { pausedAt: now, pauseReason: dto.reason });
    }

    const event = this.eventForStatus(dto.toStatus);

    const updated = await this.repository.update(id, {
      status: dto.toStatus,
      ...extraFields,
      version: subscription.version + 1,
    });

    await this.repository.createHistory({
      subscriptionId: id,
      scopeKey: subscription.scopeKey,
      changeType: SubscriptionChangeType.ADMIN_OVERRIDE,
      fromStatus: subscription.status,
      toStatus: dto.toStatus,
      reason: dto.reason,
      changedBy: userId,
      snapshot: updated as any,
    });

    this.invalidateCacheFor(updated);
    await this.auditLogsService.record({
      workspaceId,
      actorType: ActivityActorType.USER,
      actorId: userId,
      action: 'subscription-management.subscription.admin_override',
      actionCategory: AuditActionCategory.UPDATE,
      module: SUBSCRIPTION_MANAGEMENT_MODULE,
      entityType: 'Subscription',
      entityId: id,
      outcome: ActivityOutcome.SUCCESS,
      riskLevel: AuditRiskLevel.HIGH_RISK,
      flagReason: dto.reason,
      reason: dto.reason,
    });
    await this.publishEvent(event, updated, userId, { adminOverride: true });
    return updated;
  }

  // ── Reads ────────────────────────────────────────────────────────

  async getSubscription(id: string, workspaceId: string): Promise<ISubscription> {
    const subscription = await this.getSubscriptionOrThrow(id);
    await this.assertVisible(subscription, workspaceId);
    return subscription;
  }

  async getHistory(id: string, workspaceId: string): Promise<ISubscriptionHistory[]> {
    const subscription = await this.getSubscriptionOrThrow(id);
    await this.assertVisible(subscription, workspaceId);
    return this.repository.findHistory(id);
  }

  async findAllSubscriptions(workspaceId: string, filter: SubscriptionFilterDto): Promise<PaginatedSubscriptionResponseDto> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    let ownerFilter: { organizationId?: string; workspaceId?: string };
    if (filter.scope === SubscriptionScope.ORGANIZATION) {
      const organizationId = await this.getCallerOrganizationId(workspaceId);
      if (!organizationId) {
        return { data: [], total: 0, page, limit, totalPages: 0 };
      }
      ownerFilter = { organizationId };
    } else {
      ownerFilter = { workspaceId };
    }

    const [data, total] = await this.repository.findAll(ownerFilter, filter);
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Resolves WORKSPACE-scoped first, falling back to the workspace's organization-scoped subscription — the same scope-precedence pattern the Settings Framework uses. */
  async getEffectiveSubscription(workspaceId: string): Promise<ISubscription | null> {
    const cached = this.cache.get(workspaceId);
    if (cached !== undefined) {
      return cached;
    }

    const workspaceScopeKey = buildSubscriptionScopeKey({ scope: SubscriptionScope.WORKSPACE, workspaceId });
    const workspaceSubscription = await this.repository.findNonTerminalByScopeKey(workspaceScopeKey);
    if (workspaceSubscription) {
      this.cache.set(workspaceId, workspaceSubscription);
      return workspaceSubscription;
    }

    const organizationId = await this.getCallerOrganizationId(workspaceId);
    if (!organizationId) {
      this.cache.set(workspaceId, null);
      return null;
    }

    const orgScopeKey = buildSubscriptionScopeKey({ scope: SubscriptionScope.ORGANIZATION, organizationId });
    const organizationSubscription = await this.repository.findNonTerminalByScopeKey(orgScopeKey);
    this.cache.set(workspaceId, organizationSubscription ?? null);
    return organizationSubscription ?? null;
  }

  /** The minimal reference future Quota/Feature-Flag modules can key entitlement decisions off — never entitlement rules themselves. */
  async getEntitlementReference(workspaceId: string): Promise<ISubscriptionEntitlementReference | null> {
    const subscription = await this.getEffectiveSubscription(workspaceId);
    if (!subscription) {
      return null;
    }
    return {
      subscriptionId: subscription.id,
      scope: subscription.scope,
      status: subscription.status,
      type: subscription.type,
      planKey: subscription.planKey,
      isTrial: subscription.status === SubscriptionStatus.TRIAL,
      isActive: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL, SubscriptionStatus.PAST_DUE].includes(subscription.status),
    };
  }

  // ── Scheduler-callable sweep (no active scheduler wired — mirrors Approval Workflow / Task Management / Business Rules Engine's approach) ──

  async processRenewalsAndExpiry(): Promise<{ renewed: number; cancelled: number; expired: number; suspended: number }> {
    const now = new Date();
    let renewed = 0;
    let cancelled = 0;
    let expired = 0;
    let suspended = 0;

    const trials = await this.repository.findTrialsDueForExpiry(now);
    for (const subscription of trials) {
      await this.systemTransition(subscription, SubscriptionStatus.EXPIRED, {
        changeType: SubscriptionChangeType.TRIAL_EXPIRED,
        event: SubscriptionManagementEvent.SUBSCRIPTION_EXPIRED,
        extraFields: { endAt: now },
      });
      expired += 1;
    }

    const due = await this.repository.findDueForRenewalOrExpiry(now);
    for (const subscription of due) {
      if (subscription.cancelAtPeriodEnd) {
        await this.systemTransition(subscription, SubscriptionStatus.CANCELLED, {
          changeType: SubscriptionChangeType.CANCELLED,
          event: SubscriptionManagementEvent.SUBSCRIPTION_CANCELLED,
          extraFields: { endAt: now, cancelledAt: now },
        });
        cancelled += 1;
      } else if (subscription.autoRenew) {
        await this.renew(subscription, now);
        renewed += 1;
      } else {
        await this.systemTransition(subscription, SubscriptionStatus.EXPIRED, {
          changeType: SubscriptionChangeType.EXPIRED,
          event: SubscriptionManagementEvent.SUBSCRIPTION_EXPIRED,
          extraFields: { endAt: now },
        });
        expired += 1;
      }
    }

    const pastDueBeyondGrace = await this.repository.findPastDueBeyondGrace(now);
    for (const subscription of pastDueBeyondGrace) {
      await this.systemTransition(subscription, SubscriptionStatus.SUSPENDED, {
        changeType: SubscriptionChangeType.SUSPENDED,
        event: SubscriptionManagementEvent.SUBSCRIPTION_SUSPENDED,
        extraFields: { suspendedAt: now, suspensionReason: 'Grace period exhausted without payment recovery' },
      });
      suspended += 1;
    }

    this.logger.log(`Renewal sweep: renewed=${renewed} cancelled=${cancelled} expired=${expired} suspended=${suspended}`);
    return { renewed, cancelled, expired, suspended };
  }

  // ── Private helpers ──────────────────────────────────────────────

  private async renew(subscription: ISubscription, now: Date): Promise<ISubscription> {
    const scheduled = subscription.scheduledChange;
    const planKey = scheduled?.toPlanKey ?? subscription.planKey;
    const billingCycle = scheduled?.toBillingCycle ?? subscription.billingCycle;
    const currentPeriodStart = subscription.currentPeriodEnd;
    const currentPeriodEnd = computeNextPeriodEnd(currentPeriodStart, billingCycle, subscription.customBillingCycleDays);

    const prorationReference: IProrationReference | null = scheduled
      ? {
          fromPlanKey: subscription.planKey,
          toPlanKey: scheduled.toPlanKey,
          fromBillingCycle: subscription.billingCycle,
          toBillingCycle: billingCycle,
          changeType: scheduled.changeType,
          effectiveAt: now.toISOString(),
          currentPeriodStart: currentPeriodStart.toISOString(),
          currentPeriodEnd: currentPeriodEnd.toISOString(),
        }
      : null;

    const updated = await this.repository.update(subscription.id, {
      status: SubscriptionStatus.ACTIVE,
      planKey,
      billingCycle,
      currentPeriodStart,
      currentPeriodEnd,
      renewalDate: subscription.autoRenew ? currentPeriodEnd : null,
      gracePeriodEndsAt: null,
      scheduledChange: null as any,
      prorationReference: prorationReference as any,
      version: subscription.version + 1,
    });

    await this.repository.createHistory({
      subscriptionId: subscription.id,
      scopeKey: subscription.scopeKey,
      changeType: SubscriptionChangeType.RENEWED,
      fromStatus: subscription.status,
      toStatus: SubscriptionStatus.ACTIVE,
      fromPlanKey: subscription.planKey,
      toPlanKey: planKey,
      reason: 'Automatic renewal',
      snapshot: updated as any,
    });

    this.invalidateCacheFor(updated);
    await this.recordAudit(subscription.workspaceId ?? subscription.organizationId ?? 'unknown', 'system', 'subscription-management.subscription.renewed', AuditActionCategory.UPDATE, subscription.id);
    await this.publishEvent(SubscriptionManagementEvent.SUBSCRIPTION_RENEWED, updated, 'system');
    return updated;
  }

  private async systemTransition(subscription: ISubscription, to: SubscriptionStatus, options: ITransitionOptions): Promise<ISubscription> {
    return this.transition(subscription, to, 'system', options);
  }

  private async transition(
    subscription: ISubscription,
    to: SubscriptionStatus,
    userId: string,
    options: ITransitionOptions,
  ): Promise<ISubscription> {
    if (!SUBSCRIPTION_ALLOWED_TRANSITIONS[subscription.status]?.includes(to)) {
      throw new SubscriptionInvalidStateTransitionException(subscription.status, to);
    }

    const updated = await this.repository.update(subscription.id, {
      status: to,
      ...options.extraFields,
      version: subscription.version + 1,
    });

    await this.repository.createHistory({
      subscriptionId: subscription.id,
      scopeKey: subscription.scopeKey,
      changeType: options.changeType,
      fromStatus: subscription.status,
      toStatus: to,
      reason: options.reason,
      changedBy: userId === 'system' ? null : userId,
      snapshot: updated as any,
    });

    this.invalidateCacheFor(updated);
    await this.recordAudit(
      subscription.workspaceId ?? subscription.organizationId ?? 'unknown',
      userId,
      `subscription-management.subscription.${options.changeType.toLowerCase()}`,
      AuditActionCategory.UPDATE,
      subscription.id,
    );
    await this.publishEvent(options.event, updated, userId);
    return updated;
  }

  private eventForStatus(status: SubscriptionStatus): SubscriptionManagementEvent {
    switch (status) {
      case SubscriptionStatus.ACTIVE:
        return SubscriptionManagementEvent.SUBSCRIPTION_ACTIVATED;
      case SubscriptionStatus.PAUSED:
        return SubscriptionManagementEvent.SUBSCRIPTION_PAUSED;
      case SubscriptionStatus.SUSPENDED:
        return SubscriptionManagementEvent.SUBSCRIPTION_SUSPENDED;
      case SubscriptionStatus.CANCELLED:
        return SubscriptionManagementEvent.SUBSCRIPTION_CANCELLED;
      case SubscriptionStatus.EXPIRED:
        return SubscriptionManagementEvent.SUBSCRIPTION_EXPIRED;
      case SubscriptionStatus.PAST_DUE:
        return SubscriptionManagementEvent.SUBSCRIPTION_PAST_DUE;
      default:
        return SubscriptionManagementEvent.SUBSCRIPTION_CHANGED;
    }
  }

  private async getSubscriptionOrThrow(id: string): Promise<ISubscription> {
    const subscription = await this.repository.findById(id);
    if (!subscription) {
      throw new SubscriptionNotFoundException(id);
    }
    return subscription;
  }

  /** Tenant visibility check — a workspace-scoped subscription must belong to the caller's own workspace; an organization-scoped one must belong to the caller's workspace's organization. Never trusts the caller's own claim about which tenant they're acting as. */
  private async assertVisible(subscription: ISubscription, workspaceId: string): Promise<void> {
    if (subscription.workspaceId && subscription.workspaceId === workspaceId) {
      return;
    }
    if (subscription.scope === SubscriptionScope.ORGANIZATION && subscription.organizationId) {
      const callerOrganizationId = await this.getCallerOrganizationId(workspaceId);
      if (callerOrganizationId && callerOrganizationId === subscription.organizationId) {
        return;
      }
    }
    throw new SubscriptionAccessDeniedException();
  }

  private async assertCanManage(subscription: ISubscription, workspaceId: string, userId: string, userRole: string): Promise<void> {
    await this.assertVisible(subscription, workspaceId);
    await this.assertScopeRole(subscription.scope, workspaceId, userId, userRole);
  }

  private async assertScopeRole(scope: SubscriptionScope, workspaceId: string, userId: string, userRole: string): Promise<void> {
    const allowedRoles = scope === SubscriptionScope.ORGANIZATION ? SUBSCRIPTION_ORG_SCOPE_ROLES : SUBSCRIPTION_WORKSPACE_SCOPE_ROLES;
    if (allowedRoles.includes(userRole)) {
      return;
    }
    const hasGranularRole = await this.rolesPermissionsService.userHasActiveRole(workspaceId, userId, 'ADMIN');
    if (!hasGranularRole) {
      throw new SubscriptionAccessDeniedException();
    }
  }

  private async getCallerOrganizationId(workspaceId: string): Promise<string | null> {
    const workspace = await this.workspaceRepository.findById(workspaceId);
    return workspace?.organizationId ?? null;
  }

  private invalidateCacheFor(subscription: ISubscription): void {
    if (subscription.workspaceId) {
      this.cache.invalidateWorkspace(subscription.workspaceId);
    } else {
      // ORGANIZATION-scoped — could be the effective fallback for any number of workspaces.
      this.cache.invalidateAll();
    }
  }

  private addDays(from: Date, days: number): Date {
    const next = new Date(from);
    next.setDate(next.getDate() + days);
    return next;
  }

  private async recordAudit(workspaceId: string, actorId: string, action: string, actionCategory: AuditActionCategory, entityId: string): Promise<void> {
    await this.auditLogsService.record({
      workspaceId,
      actorType: actorId === 'system' ? ActivityActorType.SYSTEM : ActivityActorType.USER,
      actorId: actorId === 'system' ? undefined : actorId,
      action,
      actionCategory,
      module: SUBSCRIPTION_MANAGEMENT_MODULE,
      entityType: 'Subscription',
      entityId,
      outcome: ActivityOutcome.SUCCESS,
    });
  }

  private async publishEvent(
    event: SubscriptionManagementEvent,
    subscription: ISubscription,
    actorId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.eventQueue.publish({
      event,
      subscriptionId: subscription.id,
      scopeKey: subscription.scopeKey,
      workspaceId: subscription.workspaceId,
      organizationId: subscription.organizationId,
      actorId: actorId === 'system' ? undefined : actorId,
      metadata,
    });
  }
}
