/** AES-256-GCM encryption for TOTP secrets at rest — the identical recipe every other per-module credential encryptor in this codebase uses (same `ATLAS_CREDENTIAL_KEY` passphrase, same stored format). */
export const MFA_CREDENTIAL_CONSTANTS = {
  ENCRYPTION_VERSION: 'v1',
  ENCRYPTION_ALGORITHM: 'aes-256-gcm' as const,
  IV_LENGTH: 12,
  KEY_LENGTH: 32,
  SALT_PREFIX: 'atlas-mfa-secret',
} as const;

export const TOTP_ISSUER = 'ATLAS';

/** RFC 6238 default step (30s) with a ±1 step verification window — standard authenticator-app tolerance. */
export const TOTP_WINDOW = 1;
