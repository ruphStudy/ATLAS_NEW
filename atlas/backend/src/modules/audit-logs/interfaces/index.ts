import { ActivityActorType, ActivityOutcome } from '@modules/activity-center/interfaces';

// Re-exported so callers of this module don't also need to import from
// activity-center directly — but these are the SAME enums, not redeclared
// equivalents, per "reuse existing... patterns" / "do not create parallel
// audit systems".
export { ActivityActorType, ActivityOutcome };

export enum AuditActionCategory {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  RESTORE = 'RESTORE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  PUBLISH = 'PUBLISH',
  SYNC = 'SYNC',
  LOGIN = 'LOGIN',
  PERMISSION = 'PERMISSION',
  CONFIGURATION = 'CONFIGURATION',
  OVERRIDE = 'OVERRIDE',
  OTHER = 'OTHER',
}

export enum AuditRiskLevel {
  NORMAL = 'NORMAL',
  SUSPICIOUS = 'SUSPICIOUS',
  HIGH_RISK = 'HIGH_RISK',
}

export enum AuditEvent {
  AUDIT_RECORDED = 'audit-logs.recorded',
  SUSPICIOUS_ACTIVITY_DETECTED = 'audit-logs.suspicious_activity_detected',
}

export interface IAuditLogEntry {
  id: string;
  workspaceId: string;
  actorType: ActivityActorType;
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  action: string;
  actionCategory: AuditActionCategory;
  module: string;
  entityType?: string | null;
  entityId?: string | null;
  businessId?: string | null;
  outcome: ActivityOutcome;
  reason?: string | null;
  beforeState?: unknown;
  afterState?: unknown;
  changedFields: string[];
  correlationId?: string | null;
  requestId?: string | null;
  jobId?: string | null;
  workflowId?: string | null;
  sessionId?: string | null;
  traceId?: string | null;
  externalRef?: string | null;
  riskLevel: AuditRiskLevel;
  flagged: boolean;
  flagReason?: string | null;
  dedupeKey?: string | null;
  integrityHash?: string | null;
  previousHash?: string | null;
  metadata: unknown;
  createdAt: Date;
}

export interface IAuditEventPayload {
  event: AuditEvent;
  workspaceId: string;
  auditLogId?: string;
  actorId?: string;
  riskLevel?: AuditRiskLevel;
  metadata?: Record<string, unknown>;
}
