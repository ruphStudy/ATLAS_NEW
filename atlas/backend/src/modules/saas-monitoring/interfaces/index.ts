export enum SaasHealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
}

export enum SaasHealthCheckTrigger {
  MANUAL = 'MANUAL',
  SCHEDULED = 'SCHEDULED',
}

export enum SaasHealthIncidentStatus {
  OPEN = 'OPEN',
  RESOLVED = 'RESOLVED',
}

/** The SaaS/platform-admin modules this monitor watches — each maps to one already-registered BullMQ queue (see `MONITORED_MODULE_QUEUE_MAP`). Mirrors Operations Health's `OperationsHealthModuleKey`, applied to the SaaS module family named in scope instead of the Sprint 9 business-operation modules. */
export enum SaasHealthModuleKey {
  SUBSCRIPTION_MANAGEMENT = 'SUBSCRIPTION_MANAGEMENT',
  BILLING_ENGINE = 'BILLING_ENGINE',
  PAYMENT_PROVIDER = 'PAYMENT_PROVIDER',
  USAGE_TRACKING = 'USAGE_TRACKING',
  QUOTA_MANAGEMENT = 'QUOTA_MANAGEMENT',
  FEATURE_FLAGS = 'FEATURE_FLAGS',
  LICENSE_MANAGEMENT = 'LICENSE_MANAGEMENT',
  API_KEY_MANAGEMENT = 'API_KEY_MANAGEMENT',
  OAUTH_MANAGEMENT = 'OAUTH_MANAGEMENT',
  SSO_FRAMEWORK = 'SSO_FRAMEWORK',
  WEBHOOK_FRAMEWORK = 'WEBHOOK_FRAMEWORK',
  APP_STORE = 'APP_STORE',
  PLUGIN_FRAMEWORK = 'PLUGIN_FRAMEWORK',
  SAAS_ADMINISTRATION = 'SAAS_ADMINISTRATION',
  SAAS_AUDIT = 'SAAS_AUDIT',
}

export enum SaasHealthIssueTag {
  QUEUE_PAUSED = 'QUEUE_PAUSED',
  QUEUE_BACKLOG = 'QUEUE_BACKLOG',
  HIGH_FAILURE_RATE = 'HIGH_FAILURE_RATE',
  STUCK = 'STUCK',
  DELAYED = 'DELAYED',
  REPEATEDLY_FAILING = 'REPEATEDLY_FAILING',
  STALE_CHECK = 'STALE_CHECK',
  PAYMENT_FAILURES = 'PAYMENT_FAILURES',
  OVERDUE_BILLING = 'OVERDUE_BILLING',
  PLUGIN_QUARANTINED = 'PLUGIN_QUARANTINED',
  WEBHOOK_UNHEALTHY = 'WEBHOOK_UNHEALTHY',
}

/** Literal event names as specified in scope — deliberately hyphenated ("saas-health-degraded"), not this module's own dot-namespaced convention. */
export enum SaasHealthEvent {
  SAAS_HEALTH_DEGRADED = 'saas-health-degraded',
  SAAS_HEALTH_FAILED = 'saas-health-failed',
  SAAS_HEALTH_RESTORED = 'saas-health-restored',
}

export interface ISaasHealthIssue {
  tag: SaasHealthIssueTag;
  message: string;
}

export interface ISaasHealthSnapshot {
  id: string;
  workspaceId: string;
  module: string;
  status: SaasHealthStatus;
  queueBacklog: number;
  queueFailedCount: number;
  queueActiveCount: number;
  queuePaused: boolean;
  oldestWaitingJobAgeMs?: number | null;
  auditFailureCount: number;
  consecutiveDegradedChecks: number;
  consecutiveHealthyChecks: number;
  issues: ISaasHealthIssue[];
  safeSummary?: string | null;
  lastCheckedAt: Date;
  lastHealthyAt?: Date | null;
  lastDegradedAt?: Date | null;
  lastUnhealthyAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISaasHealthIncident {
  id: string;
  workspaceId: string;
  module: string;
  severity: SaasHealthStatus;
  status: SaasHealthIncidentStatus;
  triggerSummary: string;
  issues: ISaasHealthIssue[];
  openedAt: Date;
  resolvedAt?: Date | null;
  durationMs?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISaasHealthCheckLog {
  id: string;
  workspaceId: string;
  module: string;
  status: SaasHealthStatus;
  previousStatus?: SaasHealthStatus | null;
  trigger: SaasHealthCheckTrigger;
  queueBacklog: number;
  queueFailedCount: number;
  auditFailureCount: number;
  issues: ISaasHealthIssue[];
  safeSummary?: string | null;
  checkedAt: Date;
}

export interface IModuleHealthThresholds {
  backlogWarning: number;
  backlogCritical: number;
  failedWarning: number;
  failedCritical: number;
  auditFailureWarning: number;
  auditFailureCritical: number;
  staleCheckWarningMinutes: number;
}

export interface ITenantHealthSummary {
  workspaceId: string;
  overallStatus: SaasHealthStatus;
  modules: ISaasHealthSnapshot[];
}

/** Cross-tenant rollup — every tenant this module has ever checked, not a caller-supplied membership list (unlike Operations Health's organization summary, which needs one since it has no Workspace dependency at all; this module already depends on nothing extra to self-discover workspace ids the same way). */
export interface IPlatformHealthSummary {
  overallStatus: SaasHealthStatus;
  tenantsChecked: number;
  moduleBreakdown: Record<string, { healthy: number; degraded: number; unhealthy: number }>;
}

export interface ISaasHealthEventPayload {
  event: SaasHealthEvent;
  workspaceId: string;
  module: string;
  status: SaasHealthStatus;
  previousStatus?: SaasHealthStatus;
  incidentId?: string;
  metadata?: Record<string, unknown>;
}
