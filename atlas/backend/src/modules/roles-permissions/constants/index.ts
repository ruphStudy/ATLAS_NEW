import { UserRole } from '@prisma/client';
import { RoleType, PermissionAction, PermissionScope, AssignmentStatus } from '../interfaces';

/** The `module` tag this module's own self-management permissions are registered under. */
export const ROLES_PERMISSIONS_MODULE = 'roles-permissions';

/** Global (workspace-less) scope key for SYSTEM-type roles — see `Role.scopeKey`. */
export const SYSTEM_ROLE_SCOPE_KEY = 'SYSTEM';

/**
 * The five SYSTEM roles bridging this framework with the existing legacy
 * `UserRole` JWT claim. Deliberately flat (no parent/child relationship
 * between them) so the seed itself can never create an invalid hierarchy —
 * inheritance is a capability for CUSTOM/WORKSPACE roles admins create
 * afterward, not something this bootstrap needs to use.
 */
export const SYSTEM_ROLE_SEEDS: Array<{ key: string; name: string; legacyRole: string }> = [
  { key: 'owner', name: 'Owner', legacyRole: UserRole.OWNER },
  { key: 'admin', name: 'Admin', legacyRole: UserRole.ADMIN },
  { key: 'manager', name: 'Manager', legacyRole: UserRole.MANAGER },
  { key: 'analyst', name: 'Analyst', legacyRole: UserRole.ANALYST },
  { key: 'viewer', name: 'Viewer', legacyRole: UserRole.VIEWER },
];

/**
 * This module's own foundational permission catalog. Other modules register
 * their own permissions via the CRUD API rather than being hardcoded here —
 * mirrors how the Settings Framework hosts storage while each consuming
 * module owns its own catalog contents.
 */
export const FOUNDATIONAL_PERMISSION_SEEDS: Array<{
  key: string;
  resource: string;
  action: PermissionAction;
  scope: PermissionScope;
  description: string;
}> = [
  {
    key: 'roles-permissions.role.view',
    resource: 'role',
    action: PermissionAction.VIEW,
    scope: PermissionScope.WORKSPACE,
    description: 'View roles and their permission sets',
  },
  {
    key: 'roles-permissions.role.manage',
    resource: 'role',
    action: PermissionAction.MANAGE,
    scope: PermissionScope.WORKSPACE,
    description: 'Create, update, archive roles and grant/revoke their permissions',
  },
  {
    key: 'roles-permissions.role.admin',
    resource: 'role',
    action: PermissionAction.ADMIN,
    scope: PermissionScope.ORGANIZATION,
    description: 'Organization-wide role administration, including SYSTEM roles',
  },
  {
    key: 'roles-permissions.assignment.view',
    resource: 'assignment',
    action: PermissionAction.VIEW,
    scope: PermissionScope.WORKSPACE,
    description: 'View role assignments for users, teams and service accounts',
  },
  {
    key: 'roles-permissions.assignment.manage',
    resource: 'assignment',
    action: PermissionAction.MANAGE,
    scope: PermissionScope.WORKSPACE,
    description: 'Assign, revoke and manage the expiry of role assignments',
  },
];

/** Which foundational permissions each seeded system role starts with (all ALLOW). */
export const SYSTEM_ROLE_DEFAULT_GRANTS: Record<string, string[]> = {
  owner: FOUNDATIONAL_PERMISSION_SEEDS.map((p) => p.key),
  admin: [
    'roles-permissions.role.view',
    'roles-permissions.role.manage',
    'roles-permissions.assignment.view',
    'roles-permissions.assignment.manage',
  ],
  manager: ['roles-permissions.assignment.view'],
  analyst: [],
  viewer: [],
};

export const ROLE_ASSIGNMENT_ALLOWED_TRANSITIONS: Record<AssignmentStatus, AssignmentStatus[]> = {
  [AssignmentStatus.ACTIVE]: [AssignmentStatus.REVOKED, AssignmentStatus.EXPIRED],
  [AssignmentStatus.EXPIRED]: [AssignmentStatus.ACTIVE],
  [AssignmentStatus.REVOKED]: [],
};

export const ROLE_TYPES_MANAGEABLE_BY_WORKSPACE_ADMINS: RoleType[] = [RoleType.WORKSPACE, RoleType.CUSTOM];

export const ROLE_SORT_FIELDS = ['createdAt', 'updatedAt', 'name', 'key'] as const;
export const ASSIGNMENT_SORT_FIELDS = ['createdAt', 'updatedAt', 'effectiveFrom', 'effectiveTo'] as const;

/** Maximum inheritance chain depth walked when resolving effective permissions — guards against pathological/cyclic data. */
export const MAX_ROLE_HIERARCHY_DEPTH = 10;
