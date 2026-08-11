export const SSO_FRAMEWORK_MODULE = 'sso-framework';

/** Roles permitted to manage ORGANIZATION/WORKSPACE-scoped SSO connections. */
export const SSO_MANAGE_ROLES: string[] = ['OWNER', 'ADMIN'];

export const SSO_STATE_BYTES = 24;
export const SSO_NONCE_BYTES = 16;

/** How long an `SsoLoginRequest` (state/nonce pair) stays valid before it must be re-issued. */
export const LOGIN_REQUEST_TTL_MS = 10 * 60 * 1000;

export const SSO_REQUEST_TIMEOUT_MS = 10000;

/** How long a fetched JWKS document is trusted before `OidcTokenValidatorService` re-fetches it. */
export const JWKS_CACHE_TTL_MS = 10 * 60 * 1000;

/** Same AES-256-GCM recipe as `OAuthCredentialEncryptor`/`WebhookCredentialEncryptor` (same `ATLAS_CREDENTIAL_KEY` passphrase, same stored format) — reused so IdP certificates and OIDC client secrets get the identical at-rest guarantee without another encryption scheme. */
export const SSO_CREDENTIAL_CONSTANTS = {
  ENCRYPTION_VERSION: 'v1',
  ENCRYPTION_ALGORITHM: 'aes-256-gcm' as const,
  IV_LENGTH: 12,
  KEY_LENGTH: 32,
  SALT_PREFIX: 'atlas-sso-cred',
} as const;

export const SSO_CONNECTION_SORT_FIELDS = ['createdAt', 'updatedAt', 'name'] as const;

/** `RolesPermissionsService.assignRole()` requires an acting user + role for its own authorization check — JIT provisioning delegates to the connection's configuring admin (`SsoConnection.createdBy`), who was already required to hold one of `SSO_MANAGE_ROLES` at connection-registration time. */
export const SSO_JIT_ACTING_ROLE = 'OWNER';
