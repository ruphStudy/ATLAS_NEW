import { MonitoringAlertSeverity, MonitoringHealthLevel, IMonitoringSignal } from '@modules/monitoring-framework/interfaces';

// Re-exported so callers of this module don't also need to import from
// Monitoring Framework directly — same vocabulary, not redeclared
// equivalents, per "reuse existing... patterns" / "do not duplicate
// module-specific monitoring logic".
export { MonitoringAlertSeverity, MonitoringHealthLevel };

export enum EnterpriseHealthScope {
  PLATFORM = 'PLATFORM',
  ORGANIZATION = 'ORGANIZATION',
  BUSINESS = 'BUSINESS',
  WORKSPACE = 'WORKSPACE',
  REGION = 'REGION',
  PROVIDER = 'PROVIDER',
}

export enum EnterpriseHealthIncidentStatus {
  OPEN = 'OPEN',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED',
}

export enum EnterpriseHealthEvent {
  ENTERPRISE_HEALTH_CHANGED = 'enterprise-health.changed',
  ENTERPRISE_HEALTH_DEGRADED = 'enterprise-health.degraded',
  ENTERPRISE_HEALTH_FAILED = 'enterprise-health.failed',
  ENTERPRISE_HEALTH_RESTORED = 'enterprise-health.restored',
  INCIDENT_OPENED = 'enterprise-health.incident_opened',
  INCIDENT_ACKNOWLEDGED = 'enterprise-health.incident_acknowledged',
  INCIDENT_RESOLVED = 'enterprise-health.incident_resolved',
}

/** The seven inputs that make up the composite enterprise health score — see `ENTERPRISE_HEALTH_CONSTANTS.SCORE_WEIGHTS`. */
export interface IEnterpriseHealthScoreBreakdown {
  score: number;
  availabilityScore: number;
  latencyScore: number;
  failureScore: number;
  backlogScore: number;
  dependencyScore: number;
  securityScore: number;
  recoveryScore: number;
}

export interface IEnterpriseHealthDashboard {
  scope: EnterpriseHealthScope;
  organizationId?: string | null;
  scopeRef?: string | null;
  level: MonitoringHealthLevel;
  previousLevel?: MonitoringHealthLevel | null;
  breakdown: IEnterpriseHealthScoreBreakdown;
  signals: IMonitoringSignal[];
  openIncidentCount: number;
  unhealthySourceKeys: string[];
  generatedAt: Date;
}

export interface IEnterpriseHealthSnapshot {
  id: string;
  organizationId?: string | null;
  scope: EnterpriseHealthScope;
  scopeRef?: string | null;
  level: MonitoringHealthLevel;
  previousLevel?: MonitoringHealthLevel | null;
  score: number;
  availabilityScore?: number | null;
  latencyScore?: number | null;
  failureScore?: number | null;
  backlogScore?: number | null;
  dependencyScore?: number | null;
  securityScore?: number | null;
  recoveryScore?: number | null;
  unhealthySourceKeys: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface IEnterpriseHealthIncident {
  id: string;
  organizationId: string;
  scope: EnterpriseHealthScope;
  scopeRef?: string | null;
  severity: MonitoringAlertSeverity;
  status: EnterpriseHealthIncidentStatus;
  title: string;
  description?: string | null;
  affectedSourceKeys: string[];
  affectedRegions: string[];
  affectedProviders: string[];
  affectedWorkspaceIds: string[];
  triggeredWorkflowExecutionId?: string | null;
  openedAt: Date;
  acknowledgedAt?: Date | null;
  acknowledgedBy?: string | null;
  resolvedAt?: Date | null;
  resolvedBy?: string | null;
  resolution?: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEnterpriseHealthIncidentFilterOptions {
  organizationId?: string;
  scope?: EnterpriseHealthScope;
  scopeRef?: string;
  status?: EnterpriseHealthIncidentStatus;
  severity?: MonitoringAlertSeverity;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IEnterpriseHealthEventPayload {
  event: EnterpriseHealthEvent;
  organizationId?: string | null;
  scope?: EnterpriseHealthScope;
  scopeRef?: string | null;
  incidentId?: string;
  level?: MonitoringHealthLevel;
  previousLevel?: MonitoringHealthLevel | null;
  score?: number;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}
