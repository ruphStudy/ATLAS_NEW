import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { WorkspaceMemberRole, WorkspaceMemberStatus, WorkspaceInvitationStatus, WorkspaceStatus } from '@prisma/client';
import { UsersRepository } from '@modules/users/users.repository';
import { AuthenticationService } from '@modules/authentication/authentication.service';
import type { AuthResponseDto } from '@modules/authentication/dto';
import { RolesPermissionsService } from '@modules/roles-permissions/roles-permissions.service';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory } from '@modules/audit-logs/interfaces';
import { ActivityCenterService } from '@modules/activity-center/activity-center.service';
import { WorkspaceRepository } from './workspace.repository';
import { WorkspaceManagementEventQueue } from './jobs';
import { WORKSPACE_INVITATION_TTL_MS, WORKSPACE_MANAGEMENT_MODULE } from './constants';
import { WorkspaceManagementEvent } from './interfaces';
import type { IEffectiveMembership, IWorkspace, IWorkspaceInvitation, IWorkspaceMember } from './interfaces';
import type { InviteMemberDto, UpdateMemberRoleDto, MemberFilterDto, InvitationFilterDto, TransferOwnershipDto } from './dto';
import {
  WorkspaceAccessDeniedException,
  WorkspaceCannotRemoveOwnerException,
  WorkspaceInvitationAlreadyExistsException,
  WorkspaceInvitationEmailMismatchException,
  WorkspaceInvitationExpiredException,
  WorkspaceInvitationInvalidStateException,
  WorkspaceInvitationNotFoundException,
  WorkspaceMemberAlreadyExistsException,
  WorkspaceMemberNotFoundException,
  WorkspaceNotAMemberException,
  WorkspaceSuspendedException,
} from './exceptions/workspace.exceptions';

/**
 * WorkspaceMembershipService — membership, invitations, ownership transfer
 * and workspace switching. Additive alongside the legacy single-workspace
 * design (`User.workspaceId`, `Workspace.ownerId`): a user's home workspace
 * never needs an explicit `WorkspaceMember` row — `resolveEffectiveMembership`
 * derives it implicitly so pre-existing accounts keep working unchanged.
 */
@Injectable()
export class WorkspaceMembershipService {
  private readonly logger = new Logger(WorkspaceMembershipService.name);

  constructor(
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly usersRepository: UsersRepository,
    private readonly authenticationService: AuthenticationService,
    private readonly rolesPermissionsService: RolesPermissionsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly activityCenterService: ActivityCenterService,
    private readonly eventQueue: WorkspaceManagementEventQueue,
  ) {}

  // ── Effective membership ─────────────────────────────────────────

  async resolveEffectiveMembership(workspace: IWorkspace, userId: string): Promise<IEffectiveMembership> {
    if (workspace.ownerId === userId) {
      return { isMember: true, role: WorkspaceMemberRole.OWNER, isImplicit: true };
    }

    const explicit = await this.workspaceRepository.findMember(workspace.id, userId);
    if (explicit && explicit.status === WorkspaceMemberStatus.ACTIVE) {
      return { isMember: true, role: explicit.role, isImplicit: false };
    }

    const user = await this.usersRepository.findById(userId);
    if (user && user.workspaceId === workspace.id) {
      const impliedRole = user.role === 'ADMIN' ? WorkspaceMemberRole.ADMIN : WorkspaceMemberRole.MEMBER;
      return { isMember: true, role: impliedRole, isImplicit: true };
    }

    return { isMember: false, role: null, isImplicit: false };
  }

  async assertMember(workspace: IWorkspace, userId: string): Promise<IEffectiveMembership> {
    const membership = await this.resolveEffectiveMembership(workspace, userId);
    if (!membership.isMember) {
      throw new WorkspaceNotAMemberException();
    }
    return membership;
  }

  async assertAdmin(workspace: IWorkspace, userId: string): Promise<IEffectiveMembership> {
    const membership = await this.assertMember(workspace, userId);
    const hasAdminRole = membership.role === WorkspaceMemberRole.OWNER || membership.role === WorkspaceMemberRole.ADMIN;
    const hasGranularPermission = await this.rolesPermissionsService.userHasActiveRole(workspace.id, userId, 'ADMIN');
    if (!hasAdminRole && !hasGranularPermission) {
      throw new WorkspaceAccessDeniedException();
    }
    return membership;
  }

  // ── Members ──────────────────────────────────────────────────────

  async listMembers(workspaceId: string, userId: string, filter: MemberFilterDto): Promise<{ items: IWorkspaceMember[]; total: number; page: number; limit: number }> {
    const workspace = await this.getWorkspaceOrThrow(workspaceId);
    await this.assertMember(workspace, userId);
    const [items, total] = await this.workspaceRepository.findMembers(workspaceId, filter);
    return { items, total, page: filter.page ?? 1, limit: filter.limit ?? 20 };
  }

  async updateMemberRole(
    workspaceId: string,
    memberId: string,
    actorUserId: string,
    dto: UpdateMemberRoleDto,
  ): Promise<IWorkspaceMember> {
    const workspace = await this.getWorkspaceOrThrow(workspaceId);
    await this.assertAdmin(workspace, actorUserId);

    const member = await this.workspaceRepository.findMemberById(memberId);
    if (!member || member.workspaceId !== workspaceId) {
      throw new WorkspaceMemberNotFoundException(memberId);
    }
    if (member.role === WorkspaceMemberRole.OWNER || dto.role === WorkspaceMemberRole.OWNER) {
      throw new WorkspaceCannotRemoveOwnerException();
    }

    const updated = await this.workspaceRepository.updateMember(memberId, { role: dto.role });

    await this.recordAudit(workspaceId, actorUserId, 'workspace-management.member.role_changed', AuditActionCategory.UPDATE, member.userId);
    await this.recordActivity(workspaceId, actorUserId, 'workspace-management.member_role_changed', `Member role changed to ${dto.role}`);
    await this.publishEvent(WorkspaceManagementEvent.MEMBER_ROLE_CHANGED, workspaceId, actorUserId, member.userId);
    return updated;
  }

  async removeMember(workspaceId: string, memberId: string, actorUserId: string): Promise<void> {
    const workspace = await this.getWorkspaceOrThrow(workspaceId);
    await this.assertAdmin(workspace, actorUserId);

    const member = await this.workspaceRepository.findMemberById(memberId);
    if (!member || member.workspaceId !== workspaceId) {
      throw new WorkspaceMemberNotFoundException(memberId);
    }
    if (member.role === WorkspaceMemberRole.OWNER || workspace.ownerId === member.userId) {
      throw new WorkspaceCannotRemoveOwnerException();
    }

    await this.workspaceRepository.updateMember(memberId, {
      status: WorkspaceMemberStatus.REMOVED,
      removedAt: new Date(),
      removedBy: actorUserId,
    });

    await this.recordAudit(workspaceId, actorUserId, 'workspace-management.member.removed', AuditActionCategory.DELETE, member.userId);
    await this.recordActivity(workspaceId, actorUserId, 'workspace-management.member_removed', 'Member removed from workspace');
    await this.publishEvent(WorkspaceManagementEvent.MEMBER_REMOVED, workspaceId, actorUserId, member.userId);
  }

  // ── Invitations ────────────────────────────────────────────────

  async inviteMember(workspaceId: string, inviterUserId: string, dto: InviteMemberDto): Promise<IWorkspaceInvitation> {
    const workspace = await this.getWorkspaceOrThrow(workspaceId);
    await this.assertAdmin(workspace, inviterUserId);

    if (dto.role === WorkspaceMemberRole.OWNER) {
      throw new WorkspaceAccessDeniedException();
    }

    const existingUser = await this.usersRepository.findByEmail(dto.email);
    if (existingUser) {
      const membership = await this.resolveEffectiveMembership(workspace, existingUser.id);
      if (membership.isMember) {
        throw new WorkspaceMemberAlreadyExistsException(existingUser.id);
      }
    }

    const existingInvitation = await this.workspaceRepository.findPendingInvitationByEmail(workspaceId, dto.email);
    if (existingInvitation) {
      throw new WorkspaceInvitationAlreadyExistsException(dto.email);
    }

    const invitation = await this.workspaceRepository.createInvitation({
      workspaceId,
      email: dto.email,
      role: dto.role,
      status: WorkspaceInvitationStatus.PENDING,
      token: uuidv4(),
      invitedBy: inviterUserId,
      expiresAt: new Date(Date.now() + WORKSPACE_INVITATION_TTL_MS),
    });

    await this.recordAudit(workspaceId, inviterUserId, 'workspace-management.invitation.sent', AuditActionCategory.CREATE, invitation.id);
    await this.recordActivity(workspaceId, inviterUserId, 'workspace-management.invitation_sent', `Invited ${dto.email} as ${dto.role}`);
    await this.publishEvent(WorkspaceManagementEvent.INVITATION_SENT, workspaceId, inviterUserId, undefined, { email: dto.email });
    return invitation;
  }

  async listInvitations(
    workspaceId: string,
    userId: string,
    filter: InvitationFilterDto,
  ): Promise<{ items: IWorkspaceInvitation[]; total: number; page: number; limit: number }> {
    const workspace = await this.getWorkspaceOrThrow(workspaceId);
    await this.assertAdmin(workspace, userId);
    const [items, total] = await this.workspaceRepository.findInvitations(workspaceId, filter);
    return { items, total, page: filter.page ?? 1, limit: filter.limit ?? 20 };
  }

  async revokeInvitation(workspaceId: string, invitationId: string, actorUserId: string): Promise<void> {
    const workspace = await this.getWorkspaceOrThrow(workspaceId);
    await this.assertAdmin(workspace, actorUserId);

    const invitation = await this.getInvitationOrThrow(invitationId, workspaceId);
    if (invitation.status !== WorkspaceInvitationStatus.PENDING) {
      throw new WorkspaceInvitationInvalidStateException(invitation.status);
    }

    await this.workspaceRepository.updateInvitation(invitationId, {
      status: WorkspaceInvitationStatus.REVOKED,
      revokedAt: new Date(),
      revokedBy: actorUserId,
    });

    await this.recordAudit(workspaceId, actorUserId, 'workspace-management.invitation.revoked', AuditActionCategory.DELETE, invitationId);
    await this.publishEvent(WorkspaceManagementEvent.INVITATION_REVOKED, workspaceId, actorUserId);
  }

  async acceptInvitation(token: string, acceptingUserId: string): Promise<IWorkspaceMember> {
    const invitation = await this.workspaceRepository.findInvitationByToken(token);
    if (!invitation) {
      throw new WorkspaceInvitationNotFoundException(token);
    }
    if (invitation.status !== WorkspaceInvitationStatus.PENDING) {
      throw new WorkspaceInvitationInvalidStateException(invitation.status);
    }
    if (invitation.expiresAt.getTime() < Date.now()) {
      await this.workspaceRepository.updateInvitation(invitation.id, { status: WorkspaceInvitationStatus.EXPIRED });
      throw new WorkspaceInvitationExpiredException();
    }

    const acceptingUser = await this.usersRepository.findById(acceptingUserId);
    if (!acceptingUser) {
      throw new NotFoundException(`User '${acceptingUserId}' not found`);
    }
    if (acceptingUser.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new WorkspaceInvitationEmailMismatchException();
    }

    const existingMember = await this.workspaceRepository.findMember(invitation.workspaceId, acceptingUserId);
    const member = existingMember
      ? await this.workspaceRepository.updateMember(existingMember.id, {
          role: invitation.role,
          status: WorkspaceMemberStatus.ACTIVE,
          removedAt: null,
          removedBy: null,
        })
      : await this.workspaceRepository.createMember({
          workspaceId: invitation.workspaceId,
          userId: acceptingUserId,
          role: invitation.role,
          status: WorkspaceMemberStatus.ACTIVE,
          invitedBy: invitation.invitedBy,
        });

    await this.workspaceRepository.updateInvitation(invitation.id, {
      status: WorkspaceInvitationStatus.ACCEPTED,
      acceptedAt: new Date(),
      acceptedByUserId: acceptingUserId,
    });

    await this.recordAudit(invitation.workspaceId, acceptingUserId, 'workspace-management.invitation.accepted', AuditActionCategory.CREATE, invitation.id);
    await this.recordActivity(invitation.workspaceId, acceptingUserId, 'workspace-management.invitation_accepted', 'Invitation accepted');
    await this.publishEvent(WorkspaceManagementEvent.INVITATION_ACCEPTED, invitation.workspaceId, acceptingUserId);
    await this.publishEvent(WorkspaceManagementEvent.MEMBER_ADDED, invitation.workspaceId, acceptingUserId, acceptingUserId);
    return member;
  }

  // ── Ownership transfer ───────────────────────────────────────────

  async transferOwnership(workspaceId: string, actorUserId: string, dto: TransferOwnershipDto): Promise<IWorkspace> {
    const workspace = await this.getWorkspaceOrThrow(workspaceId);
    const membership = await this.assertMember(workspace, actorUserId);
    if (membership.role !== WorkspaceMemberRole.OWNER) {
      throw new WorkspaceAccessDeniedException();
    }

    const targetMembership = await this.resolveEffectiveMembership(workspace, dto.newOwnerUserId);
    if (!targetMembership.isMember) {
      throw new WorkspaceNotAMemberException();
    }

    const updated = await this.workspaceRepository.update(workspaceId, { ownerId: dto.newOwnerUserId });

    const newOwnerMember = await this.workspaceRepository.findMember(workspaceId, dto.newOwnerUserId);
    if (newOwnerMember) {
      await this.workspaceRepository.updateMember(newOwnerMember.id, { role: WorkspaceMemberRole.OWNER });
    } else {
      await this.workspaceRepository.createMember({
        workspaceId,
        userId: dto.newOwnerUserId,
        role: WorkspaceMemberRole.OWNER,
        status: WorkspaceMemberStatus.ACTIVE,
      });
    }

    const previousOwnerMember = await this.workspaceRepository.findMember(workspaceId, actorUserId);
    if (previousOwnerMember) {
      await this.workspaceRepository.updateMember(previousOwnerMember.id, { role: WorkspaceMemberRole.ADMIN });
    } else {
      await this.workspaceRepository.createMember({
        workspaceId,
        userId: actorUserId,
        role: WorkspaceMemberRole.ADMIN,
        status: WorkspaceMemberStatus.ACTIVE,
      });
    }

    await this.recordAudit(workspaceId, actorUserId, 'workspace-management.ownership.transferred', AuditActionCategory.UPDATE, workspaceId);
    await this.recordActivity(workspaceId, actorUserId, 'workspace-management.ownership_transferred', `Ownership transferred to ${dto.newOwnerUserId}`);
    await this.publishEvent(WorkspaceManagementEvent.OWNERSHIP_TRANSFERRED, workspaceId, actorUserId, dto.newOwnerUserId);
    return updated;
  }

  // ── Switching ──────────────────────────────────────────────────

  async switchWorkspace(userId: string, targetWorkspaceId: string): Promise<AuthResponseDto> {
    const workspace = await this.getWorkspaceOrThrow(targetWorkspaceId);
    await this.assertMember(workspace, userId);

    if (workspace.status === WorkspaceStatus.SUSPENDED || workspace.status === WorkspaceStatus.ARCHIVED) {
      throw new WorkspaceSuspendedException();
    }

    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User '${userId}' not found`);
    }

    const response = await this.authenticationService.issueTokensForWorkspace(user, targetWorkspaceId);
    await this.recordActivity(targetWorkspaceId, userId, 'workspace-management.workspace_switched', 'Switched active workspace');
    return response;
  }

  // ── Private helpers ──────────────────────────────────────────────

  private async getWorkspaceOrThrow(id: string): Promise<IWorkspace> {
    const workspace = await this.workspaceRepository.findById(id);
    if (!workspace) {
      throw new NotFoundException(`Workspace '${id}' not found`);
    }
    return workspace;
  }

  private async getInvitationOrThrow(id: string, workspaceId: string): Promise<IWorkspaceInvitation> {
    const invitation = await this.workspaceRepository.findInvitationById(id);
    if (!invitation || invitation.workspaceId !== workspaceId) {
      throw new WorkspaceInvitationNotFoundException(id);
    }
    return invitation;
  }

  private async recordAudit(workspaceId: string, actorId: string, action: string, actionCategory: AuditActionCategory, entityId: string): Promise<void> {
    await this.auditLogsService.record({
      workspaceId,
      actorType: ActivityActorType.USER,
      actorId,
      action,
      actionCategory,
      module: WORKSPACE_MANAGEMENT_MODULE,
      entityType: 'Workspace',
      entityId,
      outcome: ActivityOutcome.SUCCESS,
    });
  }

  private async recordActivity(workspaceId: string, actorId: string, action: string, title: string): Promise<void> {
    await this.activityCenterService.record({
      workspaceId,
      actorType: ActivityActorType.USER,
      actorId,
      action,
      sourceModule: WORKSPACE_MANAGEMENT_MODULE,
      entityType: 'Workspace',
      entityId: workspaceId,
      title,
      timelineId: workspaceId,
    });
  }

  private async publishEvent(
    event: WorkspaceManagementEvent,
    workspaceId: string,
    actorId?: string,
    targetUserId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.eventQueue.publish({ event, workspaceId, actorId, targetUserId, metadata });
  }
}
