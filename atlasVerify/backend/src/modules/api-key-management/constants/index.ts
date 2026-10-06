export const API_KEY_MANAGEMENT_MODULE = 'api-key-management';

/** Roles permitted to manage ORGANIZATION/WORKSPACE/SERVICE_ACCOUNT-scoped keys. A USER-scoped key can additionally always be managed by its own `ownerUserId`. */
export const API_KEY_MANAGE_ROLES: string[] = ['OWNER', 'ADMIN'];

export const API_KEY_PREFIX = 'atlas_sk_';
export const API_KEY_ID_LENGTH_HEX = 16;
export const API_KEY_SECRET_BYTES = 32;
export const API_KEY_HASH_ALGORITHM = 'sha256';

export const DEFAULT_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60 * 1000;

/** Usage recorded against this resourceKey in Usage Tracking on every successful validation — never a second, parallel per-use ledger inside this module. */
export const API_KEY_USAGE_RESOURCE_KEY = 'API_CALLS';

export const API_KEY_SORT_FIELDS = ['createdAt', 'updatedAt', 'lastUsedAt', 'name'] as const;
