export const OAUTH_MANAGEMENT_MODULE = 'oauth-management';

/** Roles permitted to manage ORGANIZATION/WORKSPACE/SERVICE_ACCOUNT-scoped clients/connections. A USER-scoped connection can additionally always be managed by its own `ownerUserId`. */
export const OAUTH_MANAGE_ROLES: string[] = ['OWNER', 'ADMIN'];

export const OAUTH_GRANT_TYPES = ['AUTHORIZATION_CODE', 'CLIENT_CREDENTIALS'] as const;

export const OAUTH_STATE_BYTES = 24;
export const OAUTH_NONCE_BYTES = 16;

/** How long an `OAuthAuthorizationRequest` (state/nonce pair) stays valid before it must be re-issued. */
export const AUTHORIZATION_REQUEST_TTL_MS = 10 * 60 * 1000;

/** Access tokens within this window of expiry are proactively refreshed by the sweep, before they actually expire. */
export const TOKEN_REFRESH_LOOKAHEAD_MS = 5 * 60 * 1000;

export const OAUTH_REQUEST_TIMEOUT_MS = 10000;

/** Same AES-256-GCM recipe as `WebhookCredentialEncryptor`/`PaymentCredentialEncryptor` (same `ATLAS_CREDENTIAL_KEY` passphrase, same stored format) — reused so OAuth client secrets and token references get the identical at-rest guarantee without another encryption scheme. */
export const OAUTH_CREDENTIAL_CONSTANTS = {
  ENCRYPTION_VERSION: 'v1',
  ENCRYPTION_ALGORITHM: 'aes-256-gcm' as const,
  IV_LENGTH: 12,
  KEY_LENGTH: 32,
  SALT_PREFIX: 'atlas-oauth-cred',
} as const;

export const OAUTH_CLIENT_SORT_FIELDS = ['createdAt', 'updatedAt', 'name'] as const;
export const OAUTH_CONNECTION_SORT_FIELDS = ['createdAt', 'updatedAt', 'lastUsedAt', 'status'] as const;
