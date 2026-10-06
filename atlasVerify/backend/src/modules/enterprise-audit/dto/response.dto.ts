import { ActivityActorType, ActivityOutcome, AuditActionCategory, AuditRiskLevel } from '@modules/audit-logs/interfaces';
import { SaasIncidentStatus, SaasIncidentType } from '@modules/saas-audit/interfaces';

export class EnterpriseAuditTrailEntryResponseDto {
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
  integrityHash?: string | null;
  previousHash?: string | null;
  createdAt: Date;
}

export class PaginatedEnterpriseAuditTrailResponseDto {
  data: EnterpriseAuditTrailEntryResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class EnterpriseAuditExportResponseDto {
  format: 'CSV' | 'JSON';
  count: number;
  content: string;
}

export class EnterpriseSecurityIncidentResponseDto {
  id: string;
  incidentType: SaasIncidentType;
  severity: AuditRiskLevel;
  workspaceId: string | null;
  organizationId: string | null;
  actorId: string | null;
  actorType: ActivityActorType | null;
  sourceAuditLogEntryId: string | null;
  summary: string;
  detail: string | null;
  status: SaasIncidentStatus;
  acknowledgedBy: string | null;
  acknowledgedAt: Date | null;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  resolutionNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedEnterpriseSecurityIncidentResponseDto {
  data: EnterpriseSecurityIncidentResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class EnterpriseAuditSweepResultResponseDto {
  organizationId: string;
  workspacesScanned: number;
  scanned: number;
  incidentsCreated: number;
}
