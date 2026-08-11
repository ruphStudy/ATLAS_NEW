export enum RoleType {
  SYSTEM = 'SYSTEM',
  ORGANIZATION = 'ORGANIZATION',
  WORKSPACE = 'WORKSPACE',
  CUSTOM = 'CUSTOM',
}

export enum RoleStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum PermissionAction {
  VIEW = 'VIEW',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  APPROVE = 'APPROVE',
  PUBLISH = 'PUBLISH',
  EXPORT = 'EXPORT',
  MANAGE = 'MANAGE',
  ADMIN = 'ADMIN',
}

export enum PermissionScope {
  ORGANIZATION = 'ORGANIZATION',
  WORKSPACE = 'WORKSPACE',
  MARKETPLACE = 'MARKETPLACE',
  WAREHOUSE = 'WAREHOUSE',
  ENTITY = 'ENTITY',
}

export enum PermissionEffect {
  ALLOW = 'ALLOW',
  DENY = 'DENY',
}

export enum PrincipalType {
  USER = 'USER',
  TEAM = 'TEAM',
  SERVICE_ACCOUNT = 'SERVICE_ACCOUNT',
}

export enum AssignmentScopeType {
  ORGANIZATION = 'ORGANIZATION',
  WORKSPACE = 'WORKSPACE',
  MARKETPLACE = 'MARKETPLACE',
  WAREHOUSE = 'WAREHOUSE',
  ENTITY = 'ENTITY',
}

export enum AssignmentStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

export enum RolesPermissionsEvent {
  ROLE_CREATED = 'roles-permissions.role_created',
  ROLE_UPDATED = 'roles-permissions.role_updated',
  ROLE_ARCHIVED = 'roles-permissions.role_archived',
  PERMISSION_GRANTED = 'roles-permissions.permission_granted',
  PERMISSION_DENIED_GRANT = 'roles-permissions.permission_denied_grant',
  PERMISSION_REVOKED = 'roles-permissions.permission_revoked',
  ASSIGNMENT_CREATED = 'roles-permissions.assignment_created',
  ASSIGNMENT_REVOKED = 'roles-permissions.assignment_revoked',
  ASSIGNMENT_EXPIRED = 'roles-permissions.assignment_expired',
}

/** Ranking used to enforce "never grant above your own authority" against the legacy flat `UserRole` on the JWT. */
export const LEGACY_ROLE_RANK: Record<string, number> = {
  OWNER: 100,
  ADMIN: 80,
  MANAGER: 60,
  ANALYST: 40,
  VIEWER: 20,
};

/** Legacy roles that already have unrestricted authority in the existing system — bypasses granular checks to preserve current access behavior. */
export const LEGACY_FULL_AUTHORITY_ROLES = ['OWNER', 'ADMIN'];

export interface IRole {
  id: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  scopeKey: string;
  key: string;
  name: string;
  description?: string | null;
  type: RoleType;
  parentRoleId?: string | null;
  isSystem: boolean;
  status: RoleStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IPermission {
  id: string;
  key: string;
  module: string;
  resource: string;
  action: PermissionAction;
  scope: PermissionScope;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  effect: PermissionEffect;
  constraints?: unknown;
  createdAt: Date;
  createdBy?: string | null;
}

export interface IRoleAssignment {
  id: string;
  workspaceId: string;
  roleId: string;
  principalType: PrincipalType;
  principalId: string;
  scopeType: AssignmentScopeType;
  scopeId?: string | null;
  status: AssignmentStatus;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  assignedBy?: string | null;
  revokedBy?: string | null;
  revokedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRoleAssignmentHistory {
  id: string;
  assignmentId: string;
  workspaceId: string;
  fromStatus?: AssignmentStatus | null;
  toStatus: AssignmentStatus;
  reason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export interface IRolePermissionHistory {
  id: string;
  roleId: string;
  permissionKey: string;
  action: 'GRANTED' | 'REVOKED' | 'DENIED';
  reason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export interface IRolesPermissionsEventPayload {
  event: RolesPermissionsEvent;
  workspaceId?: string;
  roleId?: string;
  assignmentId?: string;
  permissionKey?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}

/** What a caller is asking the checker to authorize. */
export interface IPermissionCheckRequest {
  userId: string;
  workspaceId: string;
  legacyRole: string;
  module: string;
  resource: string;
  action: PermissionAction;
  scopeType?: AssignmentScopeType;
  scopeId?: string;
}

export interface IEffectivePermission {
  key: string;
  effect: PermissionEffect;
  /** The role in the inheritance chain this permission resolved from (closest wins). */
  sourceRoleId: string;
}
