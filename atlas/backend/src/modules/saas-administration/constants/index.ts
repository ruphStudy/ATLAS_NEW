export const SAAS_ADMINISTRATION_MODULE = 'saas-administration';

/**
 * The acting-role string passed into other modules' service methods on behalf of the platform admin
 * — every module this session gates management behind `['OWNER', 'ADMIN']` (Quota, Feature Flags,
 * License, Subscription's `SUBSCRIPTION_ADMIN_OVERRIDE_ROLES`), so `'ADMIN'` satisfies all of them
 * without needing per-module role mapping.
 */
export const ADMIN_ACTING_ROLE = 'ADMIN';

export const TENANT_SORT_FIELDS = ['createdAt', 'name', 'status'] as const;
export const ADMIN_ACTION_LOG_SORT_FIELDS = ['createdAt', 'actionType'] as const;
export const IMPERSONATION_SESSION_SORT_FIELDS = ['createdAt', 'startedAt'] as const;
