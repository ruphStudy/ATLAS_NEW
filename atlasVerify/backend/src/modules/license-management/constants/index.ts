export const LICENSE_MANAGEMENT_MODULE = 'license-management';

/** Roles permitted to manage ORGANIZATION/WORKSPACE-scoped licenses. A USER-scoped license can additionally always be managed by its own `ownerUserId`. */
export const LICENSE_MANAGE_ROLES: string[] = ['OWNER', 'ADMIN'];

export const LICENSE_KEY_ID_LENGTH_HEX = 16;
export const LICENSE_RSA_KEY_BITS = 2048;
export const LICENSE_TOKEN_SIGNATURE_ALGORITHM = 'RSA-SHA256';

/** Same AES-256-GCM recipe as every other per-module credential encryptor this session (same `ATLAS_CREDENTIAL_KEY` passphrase, same stored format) — protects the license's private signing key at rest. */
export const LICENSE_CREDENTIAL_CONSTANTS = {
  ENCRYPTION_VERSION: 'v1',
  ENCRYPTION_ALGORITHM: 'aes-256-gcm' as const,
  IV_LENGTH: 12,
  KEY_LENGTH: 32,
  SALT_PREFIX: 'atlas-license-cred',
} as const;

/** Usage recorded against this module/resourceKey in Usage Tracking on every activation — never a second, parallel ledger inside this module (only the fast local `activationCount` counter). */
export const LICENSE_ACTIVATION_RESOURCE_KEY = 'LICENSE_ACTIVATIONS';

export const LICENSE_SORT_FIELDS = ['createdAt', 'updatedAt', 'expiresAt', 'type'] as const;
