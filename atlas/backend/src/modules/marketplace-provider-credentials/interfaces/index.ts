// =============================================================
// Marketplace Provider Credentials – Core Interfaces & Enums
// =============================================================

// ── Credential Status ─────────────────────────────────────────

export enum CredentialStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  EXPIRED = 'EXPIRED',
  INVALID = 'INVALID',
  REVOKED = 'REVOKED',
  ARCHIVED = 'ARCHIVED',
  PENDING_VALIDATION = 'PENDING_VALIDATION',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
}

// ── Credential Type ───────────────────────────────────────────

export enum CredentialFieldType {
  API_KEY = 'API_KEY',
  SECRET_KEY = 'SECRET_KEY',
  OAUTH_CLIENT_ID = 'OAUTH_CLIENT_ID',
  OAUTH_CLIENT_SECRET = 'OAUTH_CLIENT_SECRET',
  OAUTH_ACCESS_TOKEN = 'OAUTH_ACCESS_TOKEN',
  OAUTH_REFRESH_TOKEN = 'OAUTH_REFRESH_TOKEN',
  ACCESS_TOKEN = 'ACCESS_TOKEN',
  BEARER_TOKEN = 'BEARER_TOKEN',
  USERNAME = 'USERNAME',
  PASSWORD = 'PASSWORD',
  SELLER_ID = 'SELLER_ID',
  MERCHANT_ID = 'MERCHANT_ID',
  MARKETPLACE_ACCOUNT_ID = 'MARKETPLACE_ACCOUNT_ID',
  CUSTOM = 'CUSTOM',
}

// ── Encryption Algorithm ──────────────────────────────────────

export enum CredentialEncryptionAlgorithm {
  AES_256_GCM = 'AES_256_GCM',
}

// ── Events ───────────────────────────────────────────────────

export enum CredentialEvent {
  CREATED = 'marketplace-provider-credential-created',
  UPDATED = 'marketplace-provider-credential-updated',
  VALIDATED = 'marketplace-provider-credential-validated',
  ROTATED = 'marketplace-provider-credential-rotated',
  REFRESHED = 'marketplace-provider-credential-refreshed',
  DISABLED = 'marketplace-provider-credential-disabled',
  ENABLED = 'marketplace-provider-credential-enabled',
  EXPIRED = 'marketplace-provider-credential-expired',
  DELETED = 'marketplace-provider-credential-deleted',
  REVOKED = 'marketplace-provider-credential-revoked',
  ARCHIVED = 'marketplace-provider-credential-archived',
  CLONED = 'marketplace-provider-credential-cloned',
}

// ── Versioning ────────────────────────────────────────────────

export enum CredentialVersionStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

// ── Schema ────────────────────────────────────────────────────

export interface CredentialFieldSchema {
  key: string;
  label: string;
  type: CredentialFieldType;
  required: boolean;
  sensitive: boolean;
  description?: string;
  placeholder?: string;
  /** Regex pattern the plain-text value must match */
  pattern?: string;
  /** Minimum length for plain-text validation */
  minLength?: number;
  /** Maximum length for plain-text validation */
  maxLength?: number;
}

export interface ProviderCredentialSchema {
  providerKey: string;
  version: string;
  fields: CredentialFieldSchema[];
}

// ── Core Entities ─────────────────────────────────────────────

/**
 * A credential record persisted in the DB.
 * All sensitive field values are stored encrypted.
 */
export interface IMarketplaceProviderCredential {
  id: string;
  workspaceId: string;
  providerKey: string;
  accountId?: string | null;
  marketplaceKey?: string | null;
  credentialSetName: string;
  description?: string | null;
  status: CredentialStatus;
  version: number;
  publishedVersion?: number | null;
  versionStatus: CredentialVersionStatus;
  /** Encrypted field map stored as JSON: { fieldKey: "iv:authTag:ciphertext" } */
  encryptedFields: Record<string, string>;
  encryptionVersion: string;
  expiresAt?: Date | null;
  lastValidatedAt?: Date | null;
  lastRotatedAt?: Date | null;
  rotationScheduledAt?: Date | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IMarketplaceProviderCredentialHistory {
  id: string;
  credentialId: string;
  workspaceId: string;
  providerKey: string;
  version: number;
  status: CredentialStatus;
  versionStatus: CredentialVersionStatus;
  /** Snapshot of encrypted fields at this version */
  encryptedFields: Record<string, string>;
  encryptionVersion: string;
  expiresAt?: Date | null;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

// ── Validation ────────────────────────────────────────────────

export interface CredentialValidationError {
  field: string;
  message: string;
  code: string;
}

export interface CredentialValidationResult {
  valid: boolean;
  errors: CredentialValidationError[];
  warnings: string[];
  expired: boolean;
  missingFields: string[];
}

// ── Filter / Sort ─────────────────────────────────────────────

export interface CredentialFilterOptions {
  workspaceId?: string;
  providerKey?: string;
  accountId?: string;
  marketplaceKey?: string;
  status?: CredentialStatus | CredentialStatus[];
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ── Cache ─────────────────────────────────────────────────────

export interface CachedCredential {
  credential: IMarketplaceProviderCredential;
  cachedAt: Date;
  ttlMs: number;
}

// ── Event Payload ─────────────────────────────────────────────

export interface CredentialEventPayload {
  event: CredentialEvent;
  credentialId: string;
  workspaceId: string;
  providerKey: string;
  accountId?: string | null;
  marketplaceKey?: string | null;
  version: number;
  performedBy?: string | null;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

// ── Rotation ──────────────────────────────────────────────────

export interface RotationRequest {
  credentialId: string;
  workspaceId: string;
  /** New plain-text fields to replace existing ones */
  newFields: Record<string, string>;
  reason?: string;
  performedBy?: string;
  scheduleAt?: Date | null;
}

export interface RotationResult {
  credentialId: string;
  previousVersion: number;
  newVersion: number;
  rotatedAt: Date;
}

// ── Decrypted Credential Bag ──────────────────────────────────

/**
 * Decrypted credential fields — ephemeral, never persisted.
 * Callers must zero-out sensitive strings after use.
 */
export interface DecryptedCredentialBag {
  credentialId: string;
  workspaceId: string;
  providerKey: string;
  fields: Record<string, string>;
}
