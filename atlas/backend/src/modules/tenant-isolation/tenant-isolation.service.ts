import { Injectable } from '@nestjs/common';
import { WorkspaceRepository } from '@modules/workspace/workspace.repository';
import { WorkspaceMembershipService } from '@modules/workspace/workspace-membership.service';
import type { IWorkspace } from '@modules/workspace/interfaces';
import { UsersRepository } from '@modules/users/users.repository';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory, AuditRiskLevel } from '@modules/audit-logs/interfaces';
import { ACTIVE_TENANT_WORKSPACE_STATUSES, TENANT_ID_PARAM_KEYS, TENANT_ISOLATION_MODULE } from './constants';
import { ITenantContext, TenantContextSource, TenantIsolationSecurityEvent } from './interfaces';
import {
  InvalidTenantContextException,
  MissingTenantContextException,
  TenantAccessDeniedException,
  TenantIdTamperingDetectedException,
  TenantInactiveException,
} from './exceptions/tenant-isolation.exceptions';

interface IJwtLikePayload {
  sub?: string;
  workspaceId?: string;
  role?: string;
}

@Injectable()
export class TenantIsolationService {
  constructor(
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly membershipService: WorkspaceMembershipService,
    private readonly usersRepository: UsersRepository,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  /**
   * Resolves the tenant context for a request from the already-verified JWT
   * payload (`request.user`, set by the existing global `JwtAuthGuard`).
   * Authentication itself is never touched — this only reads its output.
   */
  async resolveContext(payload: IJwtLikePayload): Promise<ITenantContext> {
    if (!payload?.sub || !payload?.workspaceId) {
      throw new MissingTenantContextException();
    }

    const workspace = await this.workspaceRepository.findById(payload.workspaceId);
    if (!workspace) {
      throw new InvalidTenantContextException(`workspace '${payload.workspaceId}' does not exist`);
    }

    const user = await this.usersRepository.findById(payload.sub);

    return {
      userId: payload.sub,
      workspaceId: workspace.id,
      organizationId: workspace.organizationId,
      role: payload.role ?? 'VIEWER',
      isPlatformAdmin: user?.isPlatformAdmin ?? false,
      source: TenantContextSource.JWT,
    };
  }

  assertActiveTenant(workspace: IWorkspace): void {
    if (!ACTIVE_TENANT_WORKSPACE_STATUSES.includes(workspace.status)) {
      throw new TenantInactiveException();
    }
  }

  async getWorkspaceOrThrow(workspaceId: string): Promise<IWorkspace> {
    const workspace = await this.workspaceRepository.findById(workspaceId);
    if (!workspace) {
      throw new InvalidTenantContextException(`workspace '${workspaceId}' does not exist`);
    }
    return workspace;
  }

  /** Full membership check reusing Workspace Management's own resolution — never re-implemented here. */
  async assertMembership(workspace: IWorkspace, userId: string): Promise<void> {
    const membership = await this.membershipService.resolveEffectiveMembership(workspace, userId);
    if (!membership.isMember) {
      await this.recordSecurityEvent(
        TenantIsolationSecurityEvent.CROSS_TENANT_ACCESS_ATTEMPT,
        workspace.id,
        userId,
        `User attempted to access workspace '${workspace.id}' without membership`,
      );
      throw new TenantAccessDeniedException();
    }
  }

  /**
   * Scans body/query/params for any of `TENANT_ID_PARAM_KEYS` and rejects
   * the request if a supplied value disagrees with the resolved tenant
   * context — the client's own claim about "which tenant" is never trusted.
   */
  async assertNoTenantTampering(
    context: ITenantContext,
    sources: { body?: Record<string, unknown>; query?: Record<string, unknown>; params?: Record<string, unknown> },
  ): Promise<void> {
    const candidates = [sources.body, sources.query, sources.params].filter(Boolean) as Record<string, unknown>[];

    for (const source of candidates) {
      for (const key of TENANT_ID_PARAM_KEYS) {
        const value = source[key];
        if (value === undefined || value === null || value === '') {
          continue;
        }
        const expected = key.toLowerCase().includes('organization') ? context.organizationId : context.workspaceId;
        if (expected && String(value) !== expected) {
          await this.recordSecurityEvent(
            TenantIsolationSecurityEvent.TENANT_ID_TAMPERING_DETECTED,
            context.workspaceId,
            context.userId,
            `Request supplied '${key}=${String(value)}' which does not match the authenticated tenant context`,
          );
          throw new TenantIdTamperingDetectedException();
        }
      }
    }
  }

  async recordPlatformAdminOverride(context: ITenantContext, targetWorkspaceId: string, route: string): Promise<void> {
    await this.auditLogsService.record({
      workspaceId: targetWorkspaceId,
      actorType: ActivityActorType.USER,
      actorId: context.userId,
      action: TenantIsolationSecurityEvent.PLATFORM_ADMIN_OVERRIDE_USED,
      actionCategory: AuditActionCategory.PERMISSION,
      module: TENANT_ISOLATION_MODULE,
      entityType: 'Workspace',
      entityId: targetWorkspaceId,
      outcome: ActivityOutcome.SUCCESS,
      riskLevel: AuditRiskLevel.SUSPICIOUS,
      reason: `Platform admin cross-tenant access via ${route}`,
    });
  }

  private async recordSecurityEvent(
    event: TenantIsolationSecurityEvent,
    workspaceId: string,
    actorId: string,
    reason: string,
  ): Promise<void> {
    await this.auditLogsService.record({
      workspaceId,
      actorType: ActivityActorType.USER,
      actorId,
      action: event,
      actionCategory: AuditActionCategory.PERMISSION,
      module: TENANT_ISOLATION_MODULE,
      entityType: 'Workspace',
      entityId: workspaceId,
      outcome: ActivityOutcome.FAILURE,
      riskLevel: AuditRiskLevel.HIGH_RISK,
      flagReason: reason,
      reason,
    });
  }
}
