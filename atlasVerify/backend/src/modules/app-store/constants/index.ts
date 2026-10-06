export const APP_STORE_MODULE = 'app-store';

/** Roles permitted to manage a PRIVATE app listing within their own org/workspace, and to install/uninstall/enable/disable/upgrade apps for their tenant. Publishing a FIRST_PARTY/PARTNER listing into the PUBLIC catalog additionally always requires `PlatformAdminGuard`, regardless of this list. */
export const APP_STORE_MANAGE_ROLES: string[] = ['OWNER', 'ADMIN'];

export const APP_USAGE_RESOURCE_KEY = 'APP_INSTALLATIONS';

/** Same AES-256-GCM recipe as every other per-module credential encryptor this session (same `ATLAS_CREDENTIAL_KEY` passphrase, same stored format) — protects an installation's app-specific credential references at rest. */
export const APP_STORE_CREDENTIAL_CONSTANTS = {
  ENCRYPTION_VERSION: 'v1',
  ENCRYPTION_ALGORITHM: 'aes-256-gcm' as const,
  IV_LENGTH: 12,
  KEY_LENGTH: 32,
  SALT_PREFIX: 'atlas-app-store-cred',
} as const;

export const APP_LISTING_SORT_FIELDS = ['createdAt', 'updatedAt', 'name', 'installCount'] as const;
export const APP_INSTALLATION_SORT_FIELDS = ['createdAt', 'updatedAt', 'installedAt'] as const;
export const APP_REVIEW_SORT_FIELDS = ['createdAt', 'rating'] as const;

export const MIN_RATING = 1;
export const MAX_RATING = 5;
