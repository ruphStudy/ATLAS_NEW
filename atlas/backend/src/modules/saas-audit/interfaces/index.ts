import { ActivityActorType, AuditRiskLevel } from '@modules/audit-logs/interfaces';

// Re-exported so callers of this module don't also need to import from
// audit-logs directly — same enums, not redeclared equivalents, per "reuse
// existing... patterns" / "do not create a parallel audit system".
export { ActivityActorType, AuditRiskLevel };

export enum SaasIncidentType {
  PRIVILEGE_ESCALATION = 'PRIVILEGE_ESCALATION',
  DESTRUCTIVE_ACTION = 'DESTRUCTIVE_ACTION',
  REPEATED_FAILURE = 'REPEATED_FAILURE',
  SUSPICIOUS_CROSS_TENANT_ACCESS = 'SUSPICIOUS_CROSS_TENANT_ACCESS',
}

export enum SaasIncidentStatus {
  OPEN = 'OPEN',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

export enum SaasAuditArchiveStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum SaasAuditEvent {
  INCIDENT_DETECTED = 'saas-audit.incident_detected',
  INCIDENT_ACKNOWLEDGED = 'saas-audit.incident_acknowledged',
  INCIDENT_RESOLVED = 'saas-audit.incident_resolved',
  INCIDENT_DISMISSED = 'saas-audit.incident_dismissed',
  ARCHIVE_CREATED = 'saas-audit.archive_created',
  ARCHIVE_FAILED = 'saas-audit.archive_failed',
}

export interface ISaasSecurityIncident {
  id: string;
  incidentType: SaasIncidentType;
  severity: AuditRiskLevel;
  workspaceId: string | null;
  organizationId: string | null;
  actorId: string | null;
  actorType: ActivityActorType | null;
  sourceAuditLogEntryId: string | null;
  relatedAuditLogEntryIds: string[];
  summary: string;
  detail: string | null;
  status: SaasIncidentStatus;
  acknowledgedBy: string | null;
  acknowledgedAt: Date | null;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  resolutionNotes: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISaasAuditArchive {
  id: string;
  workspaceId: string | null;
  fromDate: Date;
  toDate: Date;
  entryCount: number;
  storageReference: string | null;
  format: string;
  status: SaasAuditArchiveStatus;
  requestedBy: string | null;
  completedAt: Date | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISaasAuditEventPayload {
  event: SaasAuditEvent;
  workspaceId?: string | null;
  incidentId?: string;
  archiveId?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}

export interface IDetectionSweepResult {
  scanned: number;
  incidentsCreated: number;
}
