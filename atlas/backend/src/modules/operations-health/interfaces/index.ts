export enum OperationsHealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
}

export enum OperationsHealthCheckTrigger {
  MANUAL = 'MANUAL',
  SCHEDULED = 'SCHEDULED',
}

export enum OperationsHealthIncidentStatus {
  OPEN = 'OPEN',
  RESOLVED = 'RESOLVED',
}

/** The Sprint 9 business-operation modules this engine monitors — each maps to one already-registered BullMQ queue (see MONITORED_MODULE_QUEUE_MAP). */
export enum OperationsHealthModuleKey {
  NOTIFICATIONS = 'NOTIFICATIONS',
  FILE_MANAGEMENT = 'FILE_MANAGEMENT',
  DOCUMENT_MANAGEMENT = 'DOCUMENT_MANAGEMENT',
  APPROVAL_WORKFLOW = 'APPROVAL_WORKFLOW',
  TASK_MANAGEMENT = 'TASK_MANAGEMENT',
  SEARCH_FRAMEWORK = 'SEARCH_FRAMEWORK',
  BUSINESS_RULES_ENGINE = 'BUSINESS_RULES_ENGINE',
  SETTINGS = 'SETTINGS',
}

export enum OperationsHealthIssueTag {
  QUEUE_PAUSED = 'QUEUE_PAUSED',
  QUEUE_BACKLOG = 'QUEUE_BACKLOG',
  HIGH_FAILURE_RATE = 'HIGH_FAILURE_RATE',
  STUCK = 'STUCK',
  DELAYED = 'DELAYED',
  REPEATEDLY_FAILING = 'REPEATEDLY_FAILING',
  STALE_CHECK = 'STALE_CHECK',
}

export enum OperationsHealthEvent {
  OPERATIONS_HEALTH_DEGRADED = 'operations-health.degraded',
  OPERATIONS_HEALTH_FAILED = 'operations-health.failed',
  OPERATIONS_HEALTH_RESTORED = 'operations-health.restored',
}

export interface IOperationsHealthIssue {
  tag: OperationsHealthIssueTag;
  message: string;
}

export interface IOperationsHealthSnapshot {
  id: string;
  workspaceId: string;
  module: string;
  status: OperationsHealthStatus;
  queueBacklog: number;
  queueFailedCount: number;
  queueActiveCount: number;
  queuePaused: boolean;
  oldestWaitingJobAgeMs?: number | null;
  auditFailureCount: number;
  consecutiveDegradedChecks: number;
  consecutiveHealthyChecks: number;
  issues: IOperationsHealthIssue[];
  safeSummary?: string | null;
  lastCheckedAt: Date;
  lastHealthyAt?: Date | null;
  lastDegradedAt?: Date | null;
  lastUnhealthyAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOperationsHealthIncident {
  id: string;
  workspaceId: string;
  module: string;
  severity: OperationsHealthStatus;
  status: OperationsHealthIncidentStatus;
  triggerSummary: string;
  issues: IOperationsHealthIssue[];
  openedAt: Date;
  resolvedAt?: Date | null;
  durationMs?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOperationsHealthCheckLog {
  id: string;
  workspaceId: string;
  module: string;
  status: OperationsHealthStatus;
  previousStatus?: OperationsHealthStatus | null;
  trigger: OperationsHealthCheckTrigger;
  queueBacklog: number;
  queueFailedCount: number;
  auditFailureCount: number;
  issues: IOperationsHealthIssue[];
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

export interface IWorkspaceHealthSummary {
  workspaceId: string;
  overallStatus: OperationsHealthStatus;
  modules: IOperationsHealthSnapshot[];
}

export interface IOrganizationHealthSummary {
  organizationId: string;
  overallStatus: OperationsHealthStatus;
  workspaces: IWorkspaceHealthSummary[];
}

export interface IOperationsHealthEventPayload {
  event: OperationsHealthEvent;
  workspaceId: string;
  module: string;
  status: OperationsHealthStatus;
  previousStatus?: OperationsHealthStatus;
  incidentId?: string;
  metadata?: Record<string, unknown>;
}
