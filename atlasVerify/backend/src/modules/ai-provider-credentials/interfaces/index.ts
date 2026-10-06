import { SortOrderEnum } from '../../../common/dto/pagination.dto';

// ── Enums ─────────────────────────────────────────────────────

export enum CredentialType {
  API_KEY = 'API_KEY',
  OAUTH = 'OAUTH',
  ACCESS_TOKEN = 'ACCESS_TOKEN',
  REFRESH_TOKEN = 'REFRESH_TOKEN',
  CUSTOM = 'CUSTOM',
}

/**
 * CredentialStatus
 *
 * Single operational state machine (no separate draft/publish workflow —
 * unlike AI Provider Configuration, credentials don't need staged review;
 * every mutation takes effect immediately and is recorded as a new
 * version in history).
 */
export enum CredentialStatus {
  PENDING_VALIDATION = 'PENDING_VALIDATION',
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  EXPIRED = 'EXPIRED',
  INVALID = 'INVALID',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  REVOKED = 'REVOKED',
}

// ── Core entities ─────────────────────────────────────────────
// `encryptedFields` values are always "<encVersion>:<iv>:<authTag>:<ciphertext>"
// (all base64) — plaintext never persists, never logs, never serializes
// into an API response.

export interface IAiProviderCredentialEntity {
  id: string;
  workspaceId: string;
  providerKey: string;
  modelId?: string | null;
  accountId?: string | null;
  credentialSetName: string;
  description?: string | null;
  type: CredentialType;
  status: CredentialStatus;
  version: number;
  encryptedFields: Record<string, string>;
  encryptionVersion: string;
  expiresAt?: Date | null;
  lastValidatedAt?: Date | null;
  lastRotatedAt?: Date | null;
  lastRefreshedAt?: Date | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IAiProviderCredentialHistoryEntity {
  id: string;
  credentialId: string;
  workspaceId: string;
  providerKey: string;
  version: number;
  status: CredentialStatus;
  encryptedFields: Record<string, string>;
  encryptionVersion: string;
  expiresAt?: Date | null;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

/**
 * DecryptedCredentialBag
 *
 * Ephemeral, in-memory-only plaintext field map. Never persisted, never
 * cached, never logged, never returned from a controller endpoint.
 */
export type DecryptedCredentialBag = Record<string, string>;

// ── Validation ────────────────────────────────────────────────

export interface ICredentialValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ICredentialValidationResult {
  valid: boolean;
  errors: ICredentialValidationError[];
  warnings: string[];
}

// ── Cache ─────────────────────────────────────────────────────

export interface ICachedAiProviderCredential {
  credential: IAiProviderCredentialEntity;
  cachedAt: Date;
  ttlMs: number;
}

// ── Filter ────────────────────────────────────────────────────

export interface IAiProviderCredentialFilterOptions {
  workspaceId?: string;
  providerKey?: string;
  modelId?: string;
  accountId?: string;
  status?: CredentialStatus;
  type?: CredentialType;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrderEnum;
}

// ── Resolution ────────────────────────────────────────────────

export interface IAiCredentialResolutionCriteria {
  workspaceId: string;
  providerKey: string;
  modelId?: string;
  accountId?: string;
}

// ── Connection validation ─────────────────────────────────────

export interface IAiCredentialConnectionValidationResult {
  valid: boolean;
  checkedAt: Date;
  message?: string;
  latencyMs?: number;
}
