// =============================================================
// Marketplace Account Management – Core Interfaces & Enums
// =============================================================

// ── Account Status ────────────────────────────────────────────

export enum AccountStatus {
  DRAFT = 'DRAFT',
  PENDING_VALIDATION = 'PENDING_VALIDATION',
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  INVALID = 'INVALID',
  EXPIRED = 'EXPIRED',
  SUSPENDED = 'SUSPENDED',
  ARCHIVED = 'ARCHIVED',
}

// ── Account Events ────────────────────────────────────────────

export enum AccountEvent {
  CREATED = 'marketplace-account-created',
  UPDATED = 'marketplace-account-updated',
  ACTIVATED = 'marketplace-account-activated',
  DISABLED = 'marketplace-account-disabled',
  INVALID = 'marketplace-account-invalid',
  ARCHIVED = 'marketplace-account-archived',
  RESTORED = 'marketplace-account-restored',
  DELETED = 'marketplace-account-deleted',
  DEFAULT_CHANGED = 'marketplace-default-account-changed',
}

// ── Core Account ──────────────────────────────────────────────

export interface IMarketplaceAccount {
  id: string;
  workspaceId: string;
  providerKey: string;
  marketplaceKey: string;
  accountName: string;
  externalAccountId: string;
  sellerId?: string | null;
  merchantId?: string | null;
  country?: string | null;
  region?: string | null;
  currency?: string | null;
  locale?: string | null;
  configurationRef?: string | null;
  credentialRef?: string | null;
  status: AccountStatus;
  priority: number;
  isDefault: boolean;
  lastTestedAt?: Date | null;
  lastTestSuccess?: boolean | null;
  lastTestCorrelationId?: string | null;
  metadata?: Record<string, unknown> | null;
  version: number;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// ── Account History ───────────────────────────────────────────

export interface IMarketplaceAccountHistory {
  id: string;
  accountId: string;
  workspaceId: string;
  event: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  snapshot?: Record<string, unknown> | null;
  reason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

// ── Event Payload ─────────────────────────────────────────────

export interface AccountEventPayload {
  event: AccountEvent;
  accountId: string;
  workspaceId: string;
  providerKey: string;
  marketplaceKey: string;
  externalAccountId: string;
  status?: AccountStatus;
  fromStatus?: AccountStatus | null;
  isDefault?: boolean;
  timestamp: Date;
  triggeredBy?: string | null;
}

// ── Validation Result ─────────────────────────────────────────

export interface AccountValidationResult {
  valid: boolean;
  errors: string[];
}

// ── Account Filter ────────────────────────────────────────────

export interface AccountFilterOptions {
  workspaceId: string;
  providerKey?: string | null;
  marketplaceKey?: string | null;
  country?: string | null;
  status?: AccountStatus | null;
  isDefault?: boolean | null;
  search?: string | null;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ── Config Resolve Request ────────────────────────────────────

export interface AccountConfigResolveRequest {
  workspaceId: string;
  providerKey: string;
  configurationRef?: string | null;
  credentialRef?: string | null;
}

// ── Config Resolve Result ─────────────────────────────────────

export interface AccountConfigResolveResult {
  valid: boolean;
  providerRegistered: boolean;
  configurationValid: boolean;
  credentialValid: boolean;
  errors: string[];
}
