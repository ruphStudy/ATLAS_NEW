import { ActivityActorType, ActivityOutcome, AuditActionCategory, AuditRiskLevel } from '@modules/audit-logs/interfaces';
import { SaasAuditArchiveStatus, SaasIncidentStatus, SaasIncidentType } from '../interfaces';

/** Same shape as Audit Logs' own `AuditLogEntryResponseDto` — these ARE `AuditLogEntry` rows, just read through the platform-wide surface instead of the per-tenant one. */
export class SaasAuditTrailEntryResponseDto {
  id!: string;
  workspaceId!: string;
  actorType!: ActivityActorType;
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  action!: string;
  actionCategory!: AuditActionCategory;
  module!: string;
  entityType?: string | null;
  entityId?: string | null;
  outcome!: ActivityOutcome;
  reason?: string | null;
  beforeState?: unknown;
  afterState?: unknown;
  changedFields!: string[];
  correlationId?: string | null;
  requestId?: string | null;
  jobId?: string | null;
  workflowId?: string | null;
  sessionId?: string | null;
  externalRef?: string | null;
  riskLevel!: AuditRiskLevel;
  flagged!: boolean;
  flagReason?: string | null;
  createdAt!: Date;
}

export class PaginatedSaasAuditTrailResponseDto {
  data!: SaasAuditTrailEntryResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class SaasAuditExportResponseDto {
  format!: 'CSV' | 'JSON';
  count!: number;
  content!: string;
}

export class DetectionSweepResultResponseDto {
  scanned!: number;
  incidentsCreated!: number;
}

export class SaasSecurityIncidentResponseDto {
  id!: string;
  incidentType!: SaasIncidentType;
  severity!: AuditRiskLevel;
  workspaceId!: string | null;
  organizationId!: string | null;
  actorId!: string | null;
  actorType!: ActivityActorType | null;
  sourceAuditLogEntryId!: string | null;
  relatedAuditLogEntryIds!: string[];
  summary!: string;
  detail!: string | null;
  status!: SaasIncidentStatus;
  acknowledgedBy!: string | null;
  acknowledgedAt!: Date | null;
  resolvedBy!: string | null;
  resolvedAt!: Date | null;
  resolutionNotes!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaginatedSaasSecurityIncidentResponseDto {
  data!: SaasSecurityIncidentResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

/** Never includes `storageReference` — an internal provider pointer, not a public download URL (downloads go through `downloadArchive`, which streams via `STORAGE_PROVIDER` itself). */
export class SaasAuditArchiveResponseDto {
  id!: string;
  workspaceId!: string | null;
  fromDate!: Date;
  toDate!: Date;
  entryCount!: number;
  format!: string;
  status!: SaasAuditArchiveStatus;
  requestedBy!: string | null;
  completedAt!: Date | null;
  failureReason!: string | null;
  createdAt!: Date;
}

export class PaginatedSaasAuditArchiveResponseDto {
  data!: SaasAuditArchiveResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class RetentionPurgeResultResponseDto {
  workspacesPurged!: number;
  entriesPurged!: number;
}
