import { SubscriptionStatus } from '../interfaces';

export const SUBSCRIPTION_MANAGEMENT_MODULE = 'subscription-management';

/** Roles permitted to manage subscriptions at ORGANIZATION scope. */
export const SUBSCRIPTION_ORG_SCOPE_ROLES: string[] = ['OWNER', 'ADMIN'];

/** Roles permitted to manage a workspace-scoped subscription. */
export const SUBSCRIPTION_WORKSPACE_SCOPE_ROLES: string[] = ['OWNER', 'ADMIN'];

/** Roles permitted to perform an admin override (bypasses normal transition rules). */
export const SUBSCRIPTION_ADMIN_OVERRIDE_ROLES: string[] = ['OWNER', 'ADMIN'];

/** Statuses that still "occupy" a tenant scope — a second CREATE for the same scopeKey is rejected unless `allowMultipleActive` is set. */
export const NON_TERMINAL_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.TRIAL,
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.PAST_DUE,
  SubscriptionStatus.PAUSED,
  SubscriptionStatus.SUSPENDED,
];

export const TERMINAL_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [SubscriptionStatus.CANCELLED, SubscriptionStatus.EXPIRED];

export const SUBSCRIPTION_ALLOWED_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  [SubscriptionStatus.TRIAL]: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELLED, SubscriptionStatus.EXPIRED],
  [SubscriptionStatus.ACTIVE]: [
    SubscriptionStatus.PAST_DUE,
    SubscriptionStatus.PAUSED,
    SubscriptionStatus.CANCELLED,
    SubscriptionStatus.SUSPENDED,
    SubscriptionStatus.EXPIRED,
  ],
  [SubscriptionStatus.PAST_DUE]: [SubscriptionStatus.ACTIVE, SubscriptionStatus.SUSPENDED, SubscriptionStatus.CANCELLED, SubscriptionStatus.EXPIRED],
  [SubscriptionStatus.PAUSED]: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELLED, SubscriptionStatus.EXPIRED],
  [SubscriptionStatus.SUSPENDED]: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELLED, SubscriptionStatus.EXPIRED],
  [SubscriptionStatus.CANCELLED]: [],
  [SubscriptionStatus.EXPIRED]: [],
};

export const SUBSCRIPTION_CACHE_TTL_MS = 5 * 60 * 1000;

export const SUBSCRIPTION_SORT_FIELDS = ['createdAt', 'updatedAt', 'currentPeriodEnd'] as const;

export const DEFAULT_TRIAL_DAYS = 14;
