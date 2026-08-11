import { ActivityActorType, ActivityOutcome, AuditActionCategory, AuditRiskLevel } from '../interfaces';

export class AuditLogEntryResponseDto {
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
  externalRef?: string | null;
  riskLevel: AuditRiskLevel;
  flagged: boolean;
  flagReason?: string | null;
  createdAt: Date;
}

export class PaginatedAuditLogEntryResponseDto {
  data: AuditLogEntryResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class AuditExportResponseDto {
  format: 'CSV' | 'JSON';
  count: number;
  content: string;
}
