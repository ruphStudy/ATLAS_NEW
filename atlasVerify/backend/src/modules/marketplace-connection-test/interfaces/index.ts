// =============================================================
// Marketplace Connection Testing – Core Interfaces & Enums
// =============================================================

// ── Connection Status ─────────────────────────────────────────

export enum ConnectionStatus {
  CONNECTED = 'CONNECTED',
  FAILED = 'FAILED',
  TIMEOUT = 'TIMEOUT',
  UNREACHABLE = 'UNREACHABLE',
  UNKNOWN = 'UNKNOWN',
}

// ── Auth Status ───────────────────────────────────────────────

export enum ConnectionAuthStatus {
  AUTHENTICATED = 'AUTHENTICATED',
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  CREDENTIALS_MISSING = 'CREDENTIALS_MISSING',
  CREDENTIALS_EXPIRED = 'CREDENTIALS_EXPIRED',
  CREDENTIALS_INVALID = 'CREDENTIALS_INVALID',
  UNKNOWN = 'UNKNOWN',
}

// ── Capability Status ─────────────────────────────────────────

export enum ConnectionCapabilityStatus {
  SUPPORTED = 'SUPPORTED',
  UNSUPPORTED = 'UNSUPPORTED',
  NOT_CHECKED = 'NOT_CHECKED',
}

// ── Error Category ────────────────────────────────────────────

export enum ConnectionErrorCategory {
  CONFIGURATION = 'CONFIGURATION',
  AUTHENTICATION = 'AUTHENTICATION',
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  UNSUPPORTED_CAPABILITY = 'UNSUPPORTED_CAPABILITY',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  UNKNOWN = 'UNKNOWN',
}

// ── Connection Test Event ─────────────────────────────────────

export enum ConnectionTestEvent {
  STARTED = 'marketplace-connection-test-started',
  SUCCEEDED = 'marketplace-connection-test-succeeded',
  FAILED = 'marketplace-connection-test-failed',
}

// ── Test Trigger ──────────────────────────────────────────────

export enum ConnectionTestTrigger {
  MANUAL = 'MANUAL',
  BULK = 'BULK',
  SCHEDULED = 'SCHEDULED',
}

// ── Request ───────────────────────────────────────────────────

export interface ConnectionTestRequest {
  workspaceId: string;
  providerKey: string;
  accountId?: string | null;
  capabilityKey?: string | null;
  correlationId?: string | null;
  trigger?: ConnectionTestTrigger;
  timeoutMs?: number | null;
}

// ── Result ────────────────────────────────────────────────────

export interface ConnectionTestResult {
  correlationId: string;
  workspaceId: string;
  providerKey: string;
  accountId?: string | null;
  success: boolean;
  connectionStatus: ConnectionStatus;
  authStatus: ConnectionAuthStatus;
  capabilityStatus: ConnectionCapabilityStatus;
  responseTimeMs?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  errorCategory?: ConnectionErrorCategory | null;
  retryable: boolean;
  testedAt: Date;
  triggeredBy?: ConnectionTestTrigger | null;
}

// ── Stored Record ─────────────────────────────────────────────

export interface IConnectionTestRecord {
  id: string;
  correlationId: string;
  workspaceId: string;
  providerKey: string;
  accountId?: string | null;
  success: boolean;
  connectionStatus: string;
  authStatus: string;
  capabilityStatus?: string | null;
  responseTimeMs?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  errorCategory?: string | null;
  retryable: boolean;
  testedAt: Date;
  triggeredBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// ── Event Payload ─────────────────────────────────────────────

export interface ConnectionTestEventPayload {
  event: ConnectionTestEvent;
  correlationId: string;
  workspaceId: string;
  providerKey: string;
  accountId?: string | null;
  success?: boolean;
  errorCode?: string | null;
  errorCategory?: ConnectionErrorCategory | null;
  retryable?: boolean;
  responseTimeMs?: number | null;
  timestamp: Date;
}

// ── Validation Result ─────────────────────────────────────────

export interface ConnectionTestValidationResult {
  valid: boolean;
  errors: string[];
}

// ── Filter ────────────────────────────────────────────────────

export interface ConnectionTestHistoryFilter {
  workspaceId: string;
  providerKey?: string | null;
  accountId?: string | null;
  success?: boolean | null;
  fromDate?: Date | null;
  toDate?: Date | null;
  page?: number;
  limit?: number;
}
