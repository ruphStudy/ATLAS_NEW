// =============================================================
// Monitoring Framework – Core Interfaces & Enums
//
// `IMonitoringSourceAdapter` wraps an already-existing health/
// monitoring service's own summary method and maps its result into the
// common `IMonitoringSignal` shape — this framework never re-gathers
// the underlying signals itself. SLI/SLO/alert-rule/incident/
// correlation concerns are the only genuinely new state owned here.
// =============================================================

/** The common, normalized status vocabulary every source module's own (differently-shaped) status is mapped into. */
export enum MonitoringHealthLevel {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
  OFFLINE = 'OFFLINE',
  /** A source/scope intentionally taken down for planned maintenance — distinct from an unplanned `OFFLINE`/`UNHEALTHY` failure so Enterprise Health's scoring and incident detection don't penalize or alert on expected downtime. */
  MAINTENANCE = 'MAINTENANCE',
  UNKNOWN = 'UNKNOWN',
}

export enum MonitoringSloStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ARCHIVED = 'ARCHIVED',
}

export enum MonitoringAlertSeverity {
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export enum MonitoringAlertRuleStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
}

export enum MonitoringIncidentStatus {
  OPEN = 'OPEN',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED',
}

export enum MonitoringCorrelationEventType {
  REQUEST = 'REQUEST',
  JOB = 'JOB',
  EVENT = 'EVENT',
  FAILURE = 'FAILURE',
}

export enum MonitoringDimension {
  AVAILABILITY = 'AVAILABILITY',
  LATENCY = 'LATENCY',
  THROUGHPUT = 'THROUGHPUT',
  ERROR_RATE = 'ERROR_RATE',
  SATURATION = 'SATURATION',
  QUEUE_BACKLOG = 'QUEUE_BACKLOG',
}

export enum MonitoringFrameworkEvent {
  SLO_CREATED = 'monitoring-framework.slo_created',
  SLO_UPDATED = 'monitoring-framework.slo_updated',
  SLO_ACTIVATED = 'monitoring-framework.slo_activated',
  SLO_PAUSED = 'monitoring-framework.slo_paused',
  SLO_ARCHIVED = 'monitoring-framework.slo_archived',
  ALERT_RULE_CREATED = 'monitoring-framework.alert_rule_created',
  ALERT_TRIGGERED = 'monitoring-framework.alert_triggered',
  INCIDENT_OPENED = 'monitoring-framework.incident_opened',
  INCIDENT_ACKNOWLEDGED = 'monitoring-framework.incident_acknowledged',
  INCIDENT_ESCALATED = 'monitoring-framework.incident_escalated',
  INCIDENT_RESOLVED = 'monitoring-framework.incident_resolved',
  RECOVERY_DETECTED = 'monitoring-framework.recovery_detected',
  CASCADING_FAILURE_DETECTED = 'monitoring-framework.cascading_failure_detected',
}

// ── Normalized signal ─────────────────────────────────────────

/** A single normalized health reading from one source module — metadata only, never secrets/credentials/sensitive payloads. */
export interface IMonitoringSignal {
  sourceKey: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  service?: string;
  provider?: string;
  environment?: string;
  region?: string;
  level: MonitoringHealthLevel;
  availability?: number;
  latencyMs?: number;
  throughput?: number;
  errorRate?: number;
  saturation?: number;
  queueBacklog?: number;
  retries?: number;
  message?: string;
  checkedAt: Date;
  /** Non-secret descriptive metadata only. */
  raw?: Record<string, unknown>;
}

export interface IMonitoringSourceContext {
  workspaceId?: string;
  organizationId?: string;
}

/**
 * IMonitoringSourceAdapter
 *
 * The generic contract every monitoring source wrapper implements.
 * Business modules never register a *new collection mechanism* through
 * this — they wrap an existing service's already-computed summary.
 */
export interface IMonitoringSourceAdapter {
  readonly sourceKey: string;
  collect(context: IMonitoringSourceContext): Promise<IMonitoringSignal[]>;
}

// ── Core entities ─────────────────────────────────────────────

export interface IMonitoringSlo {
  id: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  service: string;
  dimension: string;
  targetValue: number;
  warningThreshold: number;
  criticalThreshold: number;
  windowMinutes: number;
  version: number;
  status: MonitoringSloStatus;
  metadata: Record<string, unknown>;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IMonitoringSloHistory {
  id: string;
  sloId: string;
  version: number;
  status: MonitoringSloStatus;
  snapshot: Record<string, unknown>;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export interface IMonitoringAlertRule {
  id: string;
  workspaceId?: string | null;
  sloId?: string | null;
  sourceKey: string;
  service?: string | null;
  dimension?: string | null;
  conditionField: string;
  conditionOperator: string;
  conditionValue: unknown;
  severity: MonitoringAlertSeverity;
  cooldownMinutes: number;
  notifyTargetType?: string | null;
  notifyTargetRef?: string | null;
  status: MonitoringAlertRuleStatus;
  lastTriggeredAt?: Date | null;
  metadata: Record<string, unknown>;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IMonitoringIncident {
  id: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  sourceKeys: string[];
  service?: string | null;
  alertRuleId?: string | null;
  severity: MonitoringAlertSeverity;
  status: MonitoringIncidentStatus;
  correlationId?: string | null;
  title: string;
  description?: string | null;
  openedAt: Date;
  acknowledgedAt?: Date | null;
  acknowledgedBy?: string | null;
  resolvedAt?: Date | null;
  resolvedBy?: string | null;
  resolution?: string | null;
  durationMs?: number | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMonitoringIncidentHistory {
  id: string;
  incidentId: string;
  status: MonitoringIncidentStatus;
  snapshot: Record<string, unknown>;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export interface IMonitoringCorrelationEvent {
  id: string;
  correlationId: string;
  workspaceId?: string | null;
  module: string;
  eventType: MonitoringCorrelationEventType;
  refId?: string | null;
  occurredAt: Date;
  metadata: Record<string, unknown>;
}

// ── Validation ────────────────────────────────────────────────

export interface IMonitoringValidationIssue {
  field: string;
  message: string;
}

export interface IMonitoringValidationResult {
  valid: boolean;
  issues: IMonitoringValidationIssue[];
  warnings: string[];
}

// ── Dashboard read model ─────────────────────────────────────

export interface IMonitoringDashboard {
  scope: 'PLATFORM' | 'WORKSPACE';
  workspaceId?: string;
  overallLevel: MonitoringHealthLevel;
  sources: IMonitoringSignal[];
  openIncidentCount: number;
  generatedAt: Date;
}

// ── Filters ───────────────────────────────────────────────────

export interface IMonitoringSloFilterOptions {
  workspaceId?: string | null;
  service?: string;
  status?: MonitoringSloStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IMonitoringAlertRuleFilterOptions {
  workspaceId?: string | null;
  sourceKey?: string;
  status?: MonitoringAlertRuleStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IMonitoringIncidentFilterOptions {
  workspaceId?: string | null;
  status?: MonitoringIncidentStatus;
  severity?: MonitoringAlertSeverity;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ── Event payload ─────────────────────────────────────────────

export interface IMonitoringFrameworkEventPayload {
  event: MonitoringFrameworkEvent;
  workspaceId?: string | null;
  sloId?: string;
  alertRuleId?: string;
  incidentId?: string;
  status?: string;
  performedBy?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}
