import type {
  WorkspacePlan,
  WorkspaceStatus,
  WorkspaceOnboardingStatus,
  WorkspaceMemberRole,
  WorkspaceMemberStatus,
  WorkspaceInvitationStatus,
} from '@prisma/client';

/**
 * Extended Workspace type that includes fields added in the latest schema migration.
 * Prisma will expose these natively after `prisma generate`.
 */
export interface IWorkspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  ownerId: string | null;
  status: WorkspaceStatus;
  plan: WorkspacePlan;
  organizationId: string | null;
  onboardingStatus: WorkspaceOnboardingStatus;
  onboardingCompletedAt: Date | null;
  archivedAt: Date | null;
  suspendedAt: Date | null;
  suspendedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// Generic list result – items type is intentionally flexible to avoid DTO↔interface circular deps
export interface IWorkspaceListResult {
  items: unknown[];
  total: number;
  page: number;
  limit: number;
}

export interface IWorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceMemberRole;
  status: WorkspaceMemberStatus;
  invitedBy: string | null;
  joinedAt: Date;
  removedAt: Date | null;
  removedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceMemberRole;
  status: WorkspaceInvitationStatus;
  token: string;
  invitedBy: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  acceptedByUserId: string | null;
  revokedAt: Date | null;
  revokedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The caller's resolved standing in a workspace — derived from an explicit `WorkspaceMember` row OR implicitly from legacy single-workspace ownership/membership (`Workspace.ownerId` / `User.workspaceId`), so pre-existing accounts need no backfill. */
export interface IEffectiveMembership {
  isMember: boolean;
  role: WorkspaceMemberRole | null;
  isImplicit: boolean;
}

export enum WorkspaceManagementEvent {
  WORKSPACE_CREATED = 'workspace-management.workspace_created',
  WORKSPACE_UPDATED = 'workspace-management.workspace_updated',
  WORKSPACE_ACTIVATED = 'workspace-management.workspace_activated',
  WORKSPACE_SUSPENDED = 'workspace-management.workspace_suspended',
  WORKSPACE_ARCHIVED = 'workspace-management.workspace_archived',
  WORKSPACE_RESTORED = 'workspace-management.workspace_restored',
  WORKSPACE_DELETED = 'workspace-management.workspace_deleted',
  MEMBER_ADDED = 'workspace-management.member_added',
  MEMBER_ROLE_CHANGED = 'workspace-management.member_role_changed',
  MEMBER_REMOVED = 'workspace-management.member_removed',
  OWNERSHIP_TRANSFERRED = 'workspace-management.ownership_transferred',
  INVITATION_SENT = 'workspace-management.invitation_sent',
  INVITATION_ACCEPTED = 'workspace-management.invitation_accepted',
  INVITATION_REVOKED = 'workspace-management.invitation_revoked',
}

export interface IWorkspaceManagementEventPayload {
  event: WorkspaceManagementEvent;
  workspaceId: string;
  actorId?: string;
  targetUserId?: string;
  metadata?: Record<string, unknown>;
}
