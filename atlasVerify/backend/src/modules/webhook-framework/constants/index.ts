export const WEBHOOK_FRAMEWORK_MODULE = 'webhook-framework';

export const WEBHOOK_MANAGE_ROLES: string[] = ['OWNER', 'ADMIN'];

export const WEBHOOK_SECRET_BYTES = 32;
export const WEBHOOK_SIGNATURE_ALGORITHM = 'sha256';

/** Signature header format: `t=<unixMs>,v1=<hmac>` — Stripe-style timestamp-bound signing so receivers can enforce a freshness window and reject replays. */
export const WEBHOOK_SIGNATURE_HEADER = 'X-Atlas-Webhook-Signature';
export const WEBHOOK_TIMESTAMP_HEADER = 'X-Atlas-Webhook-Timestamp';
export const WEBHOOK_EVENT_ID_HEADER = 'X-Atlas-Webhook-Event-Id';
export const WEBHOOK_EVENT_TYPE_HEADER = 'X-Atlas-Webhook-Event-Type';

export const WEBHOOK_PAYLOAD_VERSION = 'v1';

/** Same AES-256-GCM recipe as `PaymentCredentialEncryptor`/`MarketplaceCredentialEncryptor` (same `ATLAS_CREDENTIAL_KEY` passphrase, same stored format) — reused so webhook signing secrets get the identical at-rest guarantee without a third encryption scheme. */
export const WEBHOOK_CREDENTIAL_CONSTANTS = {
  ENCRYPTION_VERSION: 'v1',
  ENCRYPTION_ALGORITHM: 'aes-256-gcm' as const,
  IV_LENGTH: 12,
  KEY_LENGTH: 32,
  SALT_PREFIX: 'atlas-webhook-cred',
} as const;

export const DEFAULT_RETRY_MAX_ATTEMPTS = 5;
export const DEFAULT_RETRY_BACKOFF_MS = 5000;
export const DELIVERY_REQUEST_TIMEOUT_MS = 10000;

/** Consecutive-failure thresholds driving `WebhookEndpoint.healthStatus`. */
export const HEALTH_DEGRADED_THRESHOLD = 3;
export const HEALTH_UNHEALTHY_THRESHOLD = 10;

export const WEBHOOK_SORT_FIELDS = ['createdAt', 'updatedAt', 'name'] as const;
export const WEBHOOK_DELIVERY_SORT_FIELDS = ['createdAt', 'updatedAt', 'status'] as const;
