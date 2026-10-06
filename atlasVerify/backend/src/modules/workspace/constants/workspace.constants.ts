export const WORKSPACE_CONSTANTS = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  LOGO_URL_MAX_LENGTH: 2048,
  SLUG_MAX_LENGTH: 100,
} as const;

export const WORKSPACE_MANAGEMENT_MODULE = 'workspace-management';

/** Roles permitted to manage workspace lifecycle (activate/suspend/archive/restore) and membership/invitations. */
export const WORKSPACE_ADMIN_ROLES: string[] = ['OWNER', 'ADMIN'];

/** Roles that may be assigned via invitation — OWNER is never invited, only transferred. */
export const INVITABLE_MEMBER_ROLES: string[] = ['ADMIN', 'MEMBER', 'SERVICE_ACCOUNT'];

export const WORKSPACE_STATUS_ALLOWED_TRANSITIONS: Record<string, string[]> = {
  ACTIVE: ['SUSPENDED', 'ARCHIVED'],
  SUSPENDED: ['ACTIVE', 'ARCHIVED'],
  TRIAL: ['ACTIVE', 'SUSPENDED', 'ARCHIVED'],
  CANCELLED: ['ARCHIVED'],
  ARCHIVED: ['ACTIVE'],
};

export const WORKSPACE_INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const WORKSPACE_SORT_FIELDS = ['createdAt', 'updatedAt', 'name'] as const;
