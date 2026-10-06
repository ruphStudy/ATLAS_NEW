import { CredentialStatus } from '../interfaces';

export const AI_CREDENTIAL_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  CACHE_TTL_MS: 300_000,
  CACHE_MAX_ENTRIES: 1_000,

  ALGORITHM: 'aes-256-gcm',
  ENCRYPTION_VERSION: 'v1',
  SALT_PREFIX: 'ai-cred',

  EXPIRY_WARNING_WINDOW_MS: 7 * 24 * 60 * 60 * 1000,

  ALLOWED_TRANSITIONS: {
    [CredentialStatus.PENDING_VALIDATION]: [
      CredentialStatus.ACTIVE,
      CredentialStatus.VALIDATION_FAILED,
      CredentialStatus.DISABLED,
      CredentialStatus.REVOKED,
    ],
    [CredentialStatus.ACTIVE]: [
      CredentialStatus.DISABLED,
      CredentialStatus.EXPIRED,
      CredentialStatus.INVALID,
      CredentialStatus.REVOKED,
    ],
    [CredentialStatus.DISABLED]: [CredentialStatus.ACTIVE, CredentialStatus.REVOKED],
    [CredentialStatus.EXPIRED]: [CredentialStatus.ACTIVE, CredentialStatus.REVOKED],
    [CredentialStatus.INVALID]: [CredentialStatus.ACTIVE, CredentialStatus.REVOKED],
    [CredentialStatus.VALIDATION_FAILED]: [
      CredentialStatus.ACTIVE,
      CredentialStatus.DISABLED,
      CredentialStatus.REVOKED,
    ],
    [CredentialStatus.REVOKED]: [] as CredentialStatus[],
  } as Record<CredentialStatus, CredentialStatus[]>,

  SORT_FIELDS: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    providerKey: 'providerKey',
    credentialSetName: 'credentialSetName',
    status: 'status',
    version: 'version',
    expiresAt: 'expiresAt',
  } as Record<string, string>,
} as const;
