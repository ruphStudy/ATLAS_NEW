export const QUOTA_MANAGEMENT_MODULE = 'quota-management';

/** Roles permitted to manage PLAN/ORGANIZATION/WORKSPACE-scoped policies and overrides. */
export const QUOTA_MANAGE_ROLES: string[] = ['OWNER', 'ADMIN'];

/** Default fraction of `hardLimit` at which state transitions to WARNING when a policy doesn't set its own `graceThreshold`. */
export const DEFAULT_GRACE_THRESHOLD = 0.8;

export const QUOTA_POLICY_SORT_FIELDS = ['createdAt', 'updatedAt', 'resourceKey'] as const;
export const QUOTA_OVERRIDE_SORT_FIELDS = ['createdAt', 'updatedAt', 'expiresAt'] as const;

/** Sentinel for "no feature dimension" — stored (not null) so `(scopeKey, resourceKey, feature)` stays usable as a real unique constraint. */
export const NO_FEATURE_SENTINEL = '';
