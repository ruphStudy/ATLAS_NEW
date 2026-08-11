export const USAGE_TRACKING_MODULE = 'usage-tracking';

/** Roles permitted to manually correct/reverse usage — recording usage itself is open to any authenticated caller within the workspace (it's a metering signal, not a privileged mutation). */
export const USAGE_CORRECTION_ROLES: string[] = ['OWNER', 'ADMIN'];

/**
 * Suggested, non-exhaustive vocabulary for `resourceKey` — the SAME open
 * vocabulary Plan Management's `IPlanLimit.resourceKey` uses. Purely
 * documentation/autocomplete guidance; the field itself is an open string
 * so a new resource type never needs a schema or code change.
 */
export const SUGGESTED_USAGE_RESOURCE_KEYS: string[] = [
  'API_CALLS',
  'AI_USAGE',
  'STORAGE_GB',
  'MARKETPLACES',
  'SUPPLIERS',
  'WAREHOUSES',
  'REPORTS',
  'AUTOMATIONS',
  'USERS',
  'WORKSPACES',
];

/** Resource key Usage Tracking never stores its own ledger rows for — delegated entirely to AI Usage Tracking's own summary, never duplicated. */
export const AI_USAGE_RESOURCE_KEY = 'AI_USAGE';

export const USAGE_SORT_FIELDS = ['occurredAt', 'recordedAt'] as const;

export const USAGE_BUCKET_GRANULARITIES = ['HOUR', 'DAY', 'MONTH'] as const;

/** Only used when no active subscription/plan can be resolved for a workspace — forecast still works over a rolling 30-day window rather than refusing to answer. */
export const DEFAULT_FORECAST_WINDOW_DAYS = 30;
