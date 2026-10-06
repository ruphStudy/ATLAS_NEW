import { CredentialStatus, CredentialVersionStatus } from '../interfaces';

export const MP_CREDENTIAL_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  ENCRYPTION_VERSION: 'v1',
  ENCRYPTION_ALGORITHM: 'aes-256-gcm' as const,
  IV_LENGTH: 12,
  TAG_LENGTH: 16,
  KEY_LENGTH: 32,
  SALT_PREFIX: 'atlas-cred',
  CACHE_TTL_MS: 5 * 60 * 1_000,     // 5 minutes
  CACHE_MAX_ENTRIES: 2_000,
  EXPIRY_WARNING_WINDOW_MS: 7 * 24 * 60 * 60 * 1_000, // 7 days
  MAX_FIELD_VALUE_LENGTH: 4_096,
  MASK_VALUE: '***MASKED***',

  SORT_FIELDS: new Set(['createdAt', 'updatedAt', 'providerKey', 'status', 'expiresAt']),

  ALLOWED_TRANSITIONS: {
    [CredentialStatus.ACTIVE]: [
      CredentialStatus.DISABLED,
      CredentialStatus.REVOKED,
    ],
    [CredentialStatus.DISABLED]: [
      CredentialStatus.ACTIVE,
      CredentialStatus.ARCHIVED,
      CredentialStatus.REVOKED,
    ],
    [CredentialStatus.PENDING_VALIDATION]: [
      CredentialStatus.ACTIVE,
      CredentialStatus.VALIDATION_FAILED,
      CredentialStatus.DISABLED,
    ],
    [CredentialStatus.VALIDATION_FAILED]: [
      CredentialStatus.PENDING_VALIDATION,
      CredentialStatus.DISABLED,
    ],
    [CredentialStatus.EXPIRED]: [
      CredentialStatus.DISABLED,
      CredentialStatus.REVOKED,
    ],
    [CredentialStatus.INVALID]: [
      CredentialStatus.PENDING_VALIDATION,
      CredentialStatus.DISABLED,
    ],
    [CredentialStatus.REVOKED]: [] as CredentialStatus[],
  } as Record<CredentialStatus, CredentialStatus[]>,

  VERSION_TRANSITIONS: {
    [CredentialVersionStatus.DRAFT]: [CredentialVersionStatus.PUBLISHED],
    [CredentialVersionStatus.PUBLISHED]: [CredentialVersionStatus.ARCHIVED],
    [CredentialVersionStatus.ARCHIVED]: [] as CredentialVersionStatus[],
  } as Record<CredentialVersionStatus, CredentialVersionStatus[]>,

  SENSITIVE_FIELD_TYPES: new Set([
    'API_KEY',
    'SECRET_KEY',
    'OAUTH_CLIENT_SECRET',
    'OAUTH_ACCESS_TOKEN',
    'OAUTH_REFRESH_TOKEN',
    'ACCESS_TOKEN',
    'BEARER_TOKEN',
    'PASSWORD',
  ]),
} as const;

export const MP_CREDENTIAL_ERROR_CODES = {
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  FIELD_TOO_LONG: 'FIELD_TOO_LONG',
  CREDENTIAL_EXPIRED: 'CREDENTIAL_EXPIRED',
  CREDENTIAL_REVOKED: 'CREDENTIAL_REVOKED',
  DUPLICATE_CREDENTIAL: 'DUPLICATE_CREDENTIAL',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  ENCRYPTION_FAILED: 'ENCRYPTION_FAILED',
  DECRYPTION_FAILED: 'DECRYPTION_FAILED',
  INTEGRITY_CHECK_FAILED: 'INTEGRITY_CHECK_FAILED',
  SCHEMA_VALIDATION_FAILED: 'SCHEMA_VALIDATION_FAILED',
} as const;

export const MP_CREDENTIAL_EVENT_QUEUE_CONFIG = {
  ATTEMPTS: 3,
  BACKOFF_MS: 2_000,
  REMOVE_ON_COMPLETE: 100,
  REMOVE_ON_FAIL: 50,
} as const;
