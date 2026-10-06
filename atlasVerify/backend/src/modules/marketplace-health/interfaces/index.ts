// =============================================================
// Marketplace Health Monitoring – Core Interfaces & Enums
// =============================================================

// ── Health States ─────────────────────────────────────────────

export enum MarketplaceHealthState {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
  OFFLINE = 'OFFLINE',
  MAINTENANCE = 'MAINTENANCE',
}

// ── Connection / Auth Status ──────────────────────────────────

export enum HealthConnectionStatus {
  CONNECTED = 'CONNECTED',
  FAILED = 'FAILED',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
}

export enum HealthAuthStatus {
  AUTHENTICATED = 'AUTHENTICATED',
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  EXPIRED = 'EXPIRED',
  INVALID = 'INVALID',
  UNKNOWN = 'UNKNOWN',
}

// ── Health Events ─────────────────────────────────────────────

export enum MarketplaceHealthEvent {
  UP = 'marketplace-health-up',
  DEGRADED = 'marketplace-health-degraded',
  DOWN = 'marketplace-health-down',
  RESTORED = 'marketplace-health-restored',
  CHECK_FAILED = 'marketplace-health-check-failed',
  STATE_CHANGED = 'marketplace-health-state-changed',
}

// ── Check Trigger ─────────────────────────────────────────────

export enum HealthCheckTrigger {
  SCHEDULED = 'SCHEDULED',
  MANUAL = 'MANUAL',
  RETRY = 'RETRY',
  SYSTEM = 'SYSTEM',
}

// ── Core Result ───────────────────────────────────────────────

export interface HealthCheckResult {
  workspaceId: string;
  providerKey: string;
  accountId?: string | null;
  healthState: MarketplaceHealthState;
  connectionStatus: HealthConnectionStatus;
  authStatus: HealthAuthStatus;
  apiReachable: boolean;
  responseTimeMs?: number | null;
  errorRate?: number | null;
  rateLimitRemaining?: number | null;
  rateLimitReset?: Date | null;
  consecutiveFailures: number;
  consecutiveSuccess: number;
  lastError?: string | null;
  checkedAt: Date;
}

// ── Stored Record ─────────────────────────────────────────────

export interface IHealthRecord {
  id: string;
  workspaceId: string;
  providerKey: string;
  accountId?: string | null;
  healthState: MarketplaceHealthState;
  previousState?: string | null;
  connectionStatus?: string | null;
  authStatus?: string | null;
  apiReachable: boolean;
  responseTimeMs?: number | null;
  errorRate?: number | null;
  rateLimitRemaining?: number | null;
  rateLimitReset?: Date | null;
  consecutiveFailures: number;
  consecutiveSuccess: number;
  lastError?: string | null;
  checkedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IHealthHistory {
  id: string;
  workspaceId: string;
  providerKey: string;
  accountId?: string | null;
  healthState: MarketplaceHealthState;
  previousState?: string | null;
  responseTimeMs?: number | null;
  errorRate?: number | null;
  apiReachable: boolean;
  authStatus?: string | null;
  connectionStatus?: string | null;
  lastError?: string | null;
  triggeredBy?: string | null;
  checkedAt: Date;
  createdAt: Date;
}

// ── Event Payload ─────────────────────────────────────────────

export interface HealthEventPayload {
  event: MarketplaceHealthEvent;
  workspaceId: string;
  providerKey: string;
  accountId?: string | null;
  fromState?: MarketplaceHealthState | null;
  toState: MarketplaceHealthState;
  responseTimeMs?: number | null;
  consecutiveFailures?: number;
  triggeredBy?: HealthCheckTrigger;
  timestamp: Date;
}

// ── Check Request ─────────────────────────────────────────────

export interface HealthCheckRequest {
  workspaceId: string;
  providerKey: string;
  accountId?: string | null;
  trigger?: HealthCheckTrigger;
  timeout?: number | null;
}

// ── Metrics ───────────────────────────────────────────────────

export interface HealthMetricsSnapshot {
  providerKey: string;
  workspaceId: string;
  uptimePercent: number;
  avgResponseTimeMs: number;
  p95ResponseTimeMs: number;
  successRate: number;
  failureRate: number;
  consecutiveFailures: number;
  totalChecks: number;
  lastCheckedAt?: Date | null;
  currentState: MarketplaceHealthState;
}

// ── Dashboard ─────────────────────────────────────────────────

export interface HealthDashboardEntry {
  providerKey: string;
  workspaceId: string;
  accountId?: string | null;
  healthState: MarketplaceHealthState;
  connectionStatus?: string | null;
  authStatus?: string | null;
  apiReachable: boolean;
  responseTimeMs?: number | null;
  consecutiveFailures: number;
  checkedAt?: Date | null;
  metrics: Pick<HealthMetricsSnapshot, 'uptimePercent' | 'avgResponseTimeMs' | 'successRate' | 'failureRate'>;
}

// ── Filter ────────────────────────────────────────────────────

export interface HealthHistoryFilter {
  workspaceId: string;
  providerKey?: string | null;
  accountId?: string | null;
  fromDate?: Date | null;
  toDate?: Date | null;
  state?: MarketplaceHealthState | null;
  page?: number;
  limit?: number;
}
