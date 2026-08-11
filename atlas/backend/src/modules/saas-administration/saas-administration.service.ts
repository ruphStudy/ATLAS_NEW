import { Injectable, Logger } from '@nestjs/common';
import { WorkspaceService } from '@modules/workspace/workspace.service';
import { WorkspaceRepository } from '@modules/workspace/workspace.repository';
import { SubscriptionManagementService } from '@modules/subscription-management/subscription-management.service';
import { SubscriptionStatus } from '@modules/subscription-management/interfaces';
import { BillingEngineService } from '@modules/billing-engine/billing-engine.service';
import { PaymentProviderService } from '@modules/payment-provider/payment-provider.service';
import { PaymentTransactionStatus } from '@modules/payment-provider/interfaces';
import { UsageTrackingService } from '@modules/usage-tracking/usage-tracking.service';
import { QuotaManagementService } from '@modules/quota-management/quota-management.service';
import { FeatureFlagsService } from '@modules/feature-flags/feature-flags.service';
import { FeatureFlagScopeType } from '@modules/feature-flags/interfaces';
import { LicenseManagementService } from '@modules/license-management/license-management.service';
import { AuthenticationService } from '@modules/authentication/authentication.service';
import { UsersRepository } from '@modules/users/users.repository';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory, AuditRiskLevel } from '@modules/audit-logs/interfaces';
import { SaasAdministrationRepository } from './saas-administration.repository';
import { SaasAdministrationEventQueue } from './jobs';
import {
  TenantFilterDto,
  SuspendTenantDto,
  TerminateTenantDto,
  ActivateTenantDto,
  AssignPlanDto,
  SubscriptionOverrideDto,
  QuotaOverrideDto,
  FeatureOverrideDto,
  AddNoteDto,
  UpdateInternalFlagsDto,
  UpdateSupportStatusDto,
  StartImpersonationDto,
  AdminActionLogFilterDto,
  ImpersonationSessionFilterDto,
  PaginatedTenantResponseDto,
  PaginatedAdminActionLogResponseDto,
  PaginatedImpersonationSessionResponseDto,
} from './dto';
import {
  AdminActionType,
  ImpersonationStatus,
  SaasAdminEvent,
  SupportStatus,
  IAdminActionLog,
  IAdminNote,
  IImpersonationResult,
  ITenantAdminProfile,
  ITenantOverview,
} from './interfaces';
import { ADMIN_ACTING_ROLE, SAAS_ADMINISTRATION_MODULE } from './constants';
import {
  SaasAdminImpersonationAlreadyActiveException,
  SaasAdminImpersonationNotFoundException,
  SaasAdminInvalidActionException,
  SaasAdminNoApplicableQuotaPolicyException,
  SaasAdminTenantNotFoundException,
} from './exceptions/saas-administration.exceptions';

@Injectable()
export class SaasAdministrationService {
  private readonly logger = new Logger(SaasAdministrationService.name);

  constructor(
    private readonly repository: SaasAdministrationRepository,
    private readonly workspaceService: WorkspaceService,
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly subscriptionManagementService: SubscriptionManagementService,
    private readonly billingEngineService: BillingEngineService,
    private readonly paymentProviderService: PaymentProviderService,
    private readonly usageTrackingService: UsageTrackingService,
    private readonly quotaManagementService: QuotaManagementService,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly licenseManagementService: LicenseManagementService,
    private readonly authenticationService: AuthenticationService,
    private readonly usersRepository: UsersRepository,
    private readonly auditLogsService: AuditLogsService,
    private readonly eventQueue: SaasAdministrationEventQueue,
  ) {}

  // ══════════════════════════════════════════════════════════════════
  // Platform-wide tenant search + overview
  // ══════════════════════════════════════════════════════════════════

  async searchTenants(filter: TenantFilterDto): Promise<PaginatedTenantResponseDto> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.workspaceRepository.findAllPlatformWide(
      { status: filter.status, search: filter.search, sortBy: filter.sortBy, sortOrder: filter.sortOrder },
      skip,
      limit,
    );

    return {
      data: data.map((w) => ({ id: w.id, name: w.name, slug: w.slug, status: w.status, plan: w.plan ?? null, createdAt: w.createdAt })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Assembled at read time from Workspace, Subscription, Billing, Payment Provider and this module's own admin profile — never a duplicated data store. */
  async getTenantOverview(workspaceId: string): Promise<ITenantOverview> {
    const workspace = await this.getWorkspaceOrThrow(workspaceId);

    const [subscription, billingPeriods, failedPayments, adminProfile] = await Promise.all([
      this.subscriptionManagementService.getEffectiveSubscription(workspaceId).catch(() => null),
      this.billingEngineService.findAllBillingPeriods(workspaceId, { sortBy: 'createdAt', sortOrder: 'desc', page: 1, limit: 1 } as any).catch(() => null),
      this.paymentProviderService.findAllTransactions(workspaceId, { status: PaymentTransactionStatus.FAILED, sortBy: 'createdAt', sortOrder: 'desc', page: 1, limit: 20 } as any).catch(() => null),
      this.repository.findAdminProfile(workspaceId),
    ]);

    const latestPeriod = billingPeriods?.data?.[0] as { status?: string; balanceDue?: number } | undefined;

    return {
      workspace: { id: workspace.id, name: workspace.name, status: workspace.status, plan: workspace.plan ?? null },
      subscription: subscription
        ? { id: subscription.id, status: subscription.status, planKey: subscription.planKey, isTrial: subscription.status === SubscriptionStatus.TRIAL }
        : null,
      billing: latestPeriod ? { outstandingBalance: latestPeriod.balanceDue ?? 0, latestPeriodStatus: latestPeriod.status ?? null } : null,
      recentPaymentFailures: failedPayments?.total ?? 0,
      // Quota Management does not yet expose a cross-resource "current violations" query — only
      // per-resource `checkQuota()` — so this stays a placeholder rather than a partial/misleading count.
      quotaViolations: 0,
      adminProfile,
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // Tenant lifecycle (orchestrates WorkspaceService's platform-admin bypass)
  // ══════════════════════════════════════════════════════════════════

  async activateTenant(adminUserId: string, workspaceId: string, dto: ActivateTenantDto): Promise<void> {
    await this.getWorkspaceOrThrow(workspaceId);
    await this.workspaceService.activate(workspaceId, adminUserId, true);
    await this.recordAdminAction(AdminActionType.TENANT_STATUS_CHANGE, adminUserId, workspaceId, undefined, dto.reason, SaasAdminEvent.TENANT_STATUS_CHANGED, { toStatus: 'ACTIVE' });
  }

  async suspendTenant(adminUserId: string, workspaceId: string, dto: SuspendTenantDto): Promise<void> {
    await this.getWorkspaceOrThrow(workspaceId);
    await this.workspaceService.suspend(workspaceId, adminUserId, { reason: dto.reason }, true);
    await this.recordAdminAction(AdminActionType.TENANT_STATUS_CHANGE, adminUserId, workspaceId, undefined, dto.reason, SaasAdminEvent.TENANT_STATUS_CHANGED, { toStatus: 'SUSPENDED' }, AuditRiskLevel.HIGH_RISK);
  }

  async reactivateTenant(adminUserId: string, workspaceId: string, dto: ActivateTenantDto): Promise<void> {
    await this.getWorkspaceOrThrow(workspaceId);
    await this.workspaceService.activate(workspaceId, adminUserId, true);
    await this.recordAdminAction(AdminActionType.TENANT_STATUS_CHANGE, adminUserId, workspaceId, undefined, dto.reason, SaasAdminEvent.TENANT_STATUS_CHANGED, { toStatus: 'ACTIVE', action: 'REACTIVATED' });
  }

  async terminateTenant(adminUserId: string, workspaceId: string, dto: TerminateTenantDto): Promise<void> {
    await this.getWorkspaceOrThrow(workspaceId);
    await this.workspaceService.remove(workspaceId, adminUserId, true);
    await this.recordAdminAction(AdminActionType.TENANT_STATUS_CHANGE, adminUserId, workspaceId, undefined, dto.reason, SaasAdminEvent.TENANT_STATUS_CHANGED, { toStatus: 'TERMINATED' }, AuditRiskLevel.HIGH_RISK);
  }

  // ══════════════════════════════════════════════════════════════════
  // Overrides — thin pass-throughs to each owning module's own admin primitive
  // ══════════════════════════════════════════════════════════════════

  async assignPlan(adminUserId: string, workspaceId: string, dto: AssignPlanDto): Promise<void> {
    await this.getWorkspaceOrThrow(workspaceId);
    const subscription = await this.subscriptionManagementService.getEffectiveSubscription(workspaceId);
    if (!subscription) {
      throw new SaasAdminInvalidActionException('This tenant has no active subscription to change the plan on');
    }

    await this.subscriptionManagementService.changePlan(subscription.id, workspaceId, adminUserId, ADMIN_ACTING_ROLE, {
      toPlanKey: dto.planKey,
      changeType: dto.changeType,
      effective: dto.effective as any,
      reason: dto.reason,
    } as any);

    await this.recordAdminAction(AdminActionType.PLAN_ASSIGNMENT, adminUserId, workspaceId, undefined, dto.reason, SaasAdminEvent.PLAN_ASSIGNED, { planKey: dto.planKey }, AuditRiskLevel.SUSPICIOUS);
  }

  async overrideSubscription(adminUserId: string, workspaceId: string, dto: SubscriptionOverrideDto): Promise<void> {
    await this.getWorkspaceOrThrow(workspaceId);
    await this.subscriptionManagementService.adminOverride(dto.subscriptionId, workspaceId, adminUserId, ADMIN_ACTING_ROLE, { toStatus: dto.toStatus, reason: dto.reason } as any);
    await this.recordAdminAction(AdminActionType.SUBSCRIPTION_OVERRIDE, adminUserId, workspaceId, undefined, dto.reason, SaasAdminEvent.SUBSCRIPTION_OVERRIDDEN, { subscriptionId: dto.subscriptionId, toStatus: dto.toStatus }, AuditRiskLevel.HIGH_RISK);
  }

  async overrideQuota(adminUserId: string, workspaceId: string, dto: QuotaOverrideDto): Promise<void> {
    await this.getWorkspaceOrThrow(workspaceId);

    const policies = await this.quotaManagementService.findAllPolicies(workspaceId, { resourceKey: dto.resourceKey, page: 1, limit: 1 } as any);
    const policy = policies.data[0];
    if (!policy) {
      throw new SaasAdminNoApplicableQuotaPolicyException(dto.resourceKey);
    }

    await this.quotaManagementService.createOverride(policy.id, workspaceId, adminUserId, ADMIN_ACTING_ROLE, {
      additionalHardLimit: dto.additionalHardLimit,
      reason: dto.reason,
      expiresAt: dto.expiresAt,
    });

    await this.recordAdminAction(AdminActionType.QUOTA_OVERRIDE, adminUserId, workspaceId, undefined, dto.reason, SaasAdminEvent.QUOTA_OVERRIDDEN, { resourceKey: dto.resourceKey }, AuditRiskLevel.SUSPICIOUS);
  }

  async overrideFeature(adminUserId: string, workspaceId: string, dto: FeatureOverrideDto): Promise<void> {
    await this.getWorkspaceOrThrow(workspaceId);

    await this.featureFlagsService.createOverride(dto.flagKey, workspaceId, adminUserId, ADMIN_ACTING_ROLE, {
      scope: FeatureFlagScopeType.WORKSPACE,
      enabled: dto.enabled,
      reason: dto.reason,
    } as any);

    await this.recordAdminAction(AdminActionType.FEATURE_OVERRIDE, adminUserId, workspaceId, undefined, dto.reason, SaasAdminEvent.FEATURE_OVERRIDDEN, { flagKey: dto.flagKey, enabled: dto.enabled }, AuditRiskLevel.SUSPICIOUS);
  }

  // ══════════════════════════════════════════════════════════════════
  // Read-only cross-tenant views — thin pass-throughs, never re-implemented
  // ══════════════════════════════════════════════════════════════════

  async listLicensesForTenant(workspaceId: string) {
    await this.getWorkspaceOrThrow(workspaceId);
    return this.licenseManagementService.findAllLicenses(workspaceId, {});
  }

  async getTenantUsage(workspaceId: string, resourceKey?: string) {
    await this.getWorkspaceOrThrow(workspaceId);
    return this.usageTrackingService.getUsageSummary(workspaceId, resourceKey);
  }

  // ══════════════════════════════════════════════════════════════════
  // Admin notes, internal flags, support status
  // ══════════════════════════════════════════════════════════════════

  async addNote(adminUserId: string, workspaceId: string, dto: AddNoteDto): Promise<IAdminNote> {
    await this.getWorkspaceOrThrow(workspaceId);
    const note = await this.repository.createNote({ workspaceId, note: dto.note, createdBy: adminUserId });
    await this.recordAdminAction(AdminActionType.NOTE_ADDED, adminUserId, workspaceId, undefined, undefined, SaasAdminEvent.NOTE_ADDED);
    return note;
  }

  async listNotes(workspaceId: string): Promise<IAdminNote[]> {
    await this.getWorkspaceOrThrow(workspaceId);
    return this.repository.findNotes(workspaceId);
  }

  async updateFlags(adminUserId: string, workspaceId: string, dto: UpdateInternalFlagsDto): Promise<ITenantAdminProfile> {
    const profile = await this.getOrCreateAdminProfile(workspaceId);
    const updated = await this.repository.updateAdminProfile(profile.id, { internalFlags: dto.internalFlags, updatedBy: adminUserId });
    await this.recordAdminAction(AdminActionType.FLAG_UPDATED, adminUserId, workspaceId, undefined, undefined, SaasAdminEvent.FLAGS_UPDATED, { internalFlags: dto.internalFlags });
    return updated;
  }

  async updateSupportStatus(adminUserId: string, workspaceId: string, dto: UpdateSupportStatusDto): Promise<ITenantAdminProfile> {
    const profile = await this.getOrCreateAdminProfile(workspaceId);
    const updated = await this.repository.updateAdminProfile(profile.id, { supportStatus: dto.supportStatus, updatedBy: adminUserId });
    await this.recordAdminAction(AdminActionType.SUPPORT_STATUS_CHANGE, adminUserId, workspaceId, undefined, dto.reason, SaasAdminEvent.SUPPORT_STATUS_CHANGED, { supportStatus: dto.supportStatus });
    return updated;
  }

  async getAdminProfile(workspaceId: string): Promise<ITenantAdminProfile | null> {
    await this.getWorkspaceOrThrow(workspaceId);
    return this.repository.findAdminProfile(workspaceId);
  }

  // ══════════════════════════════════════════════════════════════════
  // Impersonation — explicit, secure, fully audited
  // ══════════════════════════════════════════════════════════════════

  async startImpersonation(adminUserId: string, workspaceId: string, dto: StartImpersonationDto, ipAddress?: string): Promise<IImpersonationResult> {
    await this.getWorkspaceOrThrow(workspaceId);

    const existing = await this.repository.findActiveImpersonationSession(adminUserId, dto.targetUserId);
    if (existing) {
      throw new SaasAdminImpersonationAlreadyActiveException();
    }

    const targetUser = await this.usersRepository.findById(dto.targetUserId);
    if (!targetUser) {
      throw new SaasAdminInvalidActionException(`Target user '${dto.targetUserId}' not found`);
    }

    const session = await this.repository.createImpersonationSession({
      adminUserId,
      targetUserId: dto.targetUserId,
      targetWorkspaceId: workspaceId,
      reason: dto.reason,
      ipAddress: ipAddress ?? null,
      status: ImpersonationStatus.ACTIVE,
    });

    const tokens = await this.authenticationService.issueTokensForWorkspace(targetUser, workspaceId);

    await this.recordAdminAction(
      AdminActionType.IMPERSONATION_STARTED,
      adminUserId,
      workspaceId,
      dto.targetUserId,
      dto.reason,
      SaasAdminEvent.IMPERSONATION_STARTED,
      { sessionId: session.id },
      AuditRiskLevel.HIGH_RISK,
    );

    return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, sessionId: session.id, targetUserId: dto.targetUserId, targetWorkspaceId: workspaceId };
  }

  async endImpersonation(adminUserId: string, sessionId: string): Promise<void> {
    const session = await this.repository.findImpersonationSessionById(sessionId);
    if (!session || session.adminUserId !== adminUserId) {
      throw new SaasAdminImpersonationNotFoundException(sessionId);
    }
    if (session.status !== ImpersonationStatus.ACTIVE) {
      return;
    }

    await this.repository.updateImpersonationSession(sessionId, { status: ImpersonationStatus.ENDED, endedAt: new Date() });

    await this.recordAdminAction(
      AdminActionType.IMPERSONATION_ENDED,
      adminUserId,
      session.targetWorkspaceId,
      session.targetUserId,
      undefined,
      SaasAdminEvent.IMPERSONATION_ENDED,
      { sessionId },
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // Immutable admin action history
  // ══════════════════════════════════════════════════════════════════

  async listActionLog(filter: AdminActionLogFilterDto): Promise<PaginatedAdminActionLogResponseDto> {
    const [data, total] = await this.repository.findAllActionLogs(filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Cross-tenant, token-free listing of impersonation sessions — used by this module's own admin history and reused by SaaS Audit's security surface. */
  async listImpersonationSessions(filter: ImpersonationSessionFilterDto): Promise<PaginatedImpersonationSessionResponseDto> {
    const [data, total] = await this.repository.findAllImpersonationSessions(filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ══════════════════════════════════════════════════════════════════
  // Private helpers
  // ══════════════════════════════════════════════════════════════════

  /** Reads via `WorkspaceRepository` directly (not `WorkspaceService.findById`, which requires caller membership) — a platform admin is deliberately not a member of the tenant it's inspecting. Pure read, no business logic bypassed. */
  private async getWorkspaceOrThrow(workspaceId: string) {
    const workspace = await this.workspaceRepository.findById(workspaceId);
    if (!workspace) {
      throw new SaasAdminTenantNotFoundException(workspaceId);
    }
    return workspace;
  }

  private async getOrCreateAdminProfile(workspaceId: string): Promise<ITenantAdminProfile> {
    await this.getWorkspaceOrThrow(workspaceId);
    const existing = await this.repository.findAdminProfile(workspaceId);
    if (existing) return existing;
    return this.repository.createAdminProfile({ workspaceId, internalFlags: [], supportStatus: SupportStatus.NONE });
  }

  /** Dual-write: an `AdminActionLog` row (cross-tenant, immutable, queryable by admin) AND an Audit Logs entry scoped to the TARGET workspace (reusing the existing audit pattern) — never a replacement for either. */
  private async recordAdminAction(
    actionType: AdminActionType,
    performedBy: string,
    targetWorkspaceId: string | undefined,
    targetUserId: string | undefined,
    reason: string | undefined,
    event: SaasAdminEvent,
    metadata?: Record<string, unknown>,
    riskLevel: AuditRiskLevel = AuditRiskLevel.SUSPICIOUS,
  ): Promise<IAdminActionLog> {
    const log = await this.repository.createActionLog({ actionType, targetWorkspaceId: targetWorkspaceId ?? null, targetUserId: targetUserId ?? null, performedBy, reason: reason ?? null, metadata: metadata as any });

    if (targetWorkspaceId) {
      await this.auditLogsService.record({
        workspaceId: targetWorkspaceId,
        actorType: ActivityActorType.USER,
        actorId: performedBy,
        action: `saas-administration.${actionType.toLowerCase()}`,
        actionCategory: AuditActionCategory.CONFIGURATION,
        module: SAAS_ADMINISTRATION_MODULE,
        entityType: 'Tenant',
        entityId: targetWorkspaceId,
        outcome: ActivityOutcome.SUCCESS,
        reason,
        riskLevel,
        metadata,
      });
    }

    await this.eventQueue.publish({ event, targetWorkspaceId, targetUserId, performedBy, metadata });
    return log;
  }
}
