export const PAYMENT_PROVIDER_MODULE = 'payment-provider';

/** Roles permitted to register accounts, configure credentials, and manage payment provider settings for a workspace. */
export const PAYMENT_PROVIDER_MANAGE_ROLES: string[] = ['OWNER', 'ADMIN'];

/** Well-known provider keys — the registry accepts any string, these are just the two adapters shipped in this module. */
export const PAYMENT_PROVIDER_KEYS = {
  STRIPE: 'STRIPE',
  RAZORPAY: 'RAZORPAY',
} as const;

export const DEFAULT_ACCOUNT_PRIORITY = 100;

export const CONNECTION_TEST_TIMEOUT_MS = 10_000;
export const PROVIDER_REQUEST_TIMEOUT_MS = 15_000;
export const PROVIDER_REQUEST_MAX_RETRIES = 2;
export const PROVIDER_REQUEST_RETRY_DELAY_MS = 500;

export const CONSECUTIVE_FAILURES_FOR_UNHEALTHY = 3;
export const CONSECUTIVE_FAILURES_FOR_DEGRADED = 1;

/**
 * Same AES-256-GCM + scrypt-derived-key recipe as
 * `marketplace-provider-credentials` — reusing the identical
 * `ATLAS_CREDENTIAL_KEY` passphrase and stored-value format
 * (`version:iv:authTag:ciphertext`) rather than inventing a second
 * encryption scheme for the same class of secret.
 */
export const PAYMENT_CREDENTIAL_CONSTANTS = {
  ENCRYPTION_VERSION: 'v1',
  ENCRYPTION_ALGORITHM: 'aes-256-gcm' as const,
  IV_LENGTH: 12,
  TAG_LENGTH: 16,
  KEY_LENGTH: 32,
  SALT_PREFIX: 'atlas-payment-cred',
  MASK_VALUE: '***MASKED***',
} as const;

export const PAYMENT_CREDENTIAL_ERROR_CODES = {
  ENCRYPTION_FAILED: 'PAYMENT_CREDENTIAL_ENCRYPTION_FAILED',
  DECRYPTION_FAILED: 'PAYMENT_CREDENTIAL_DECRYPTION_FAILED',
} as const;

export const PAYMENT_SORT_FIELDS = ['createdAt', 'updatedAt'] as const;

/** Idempotency-key TTL is implicit (the DB unique constraint never expires) — kept here only as the window used to dedupe *retried* requests at the service layer before hitting the provider. */
export const IDEMPOTENCY_LOOKBACK_MS = 24 * 60 * 60 * 1000;
