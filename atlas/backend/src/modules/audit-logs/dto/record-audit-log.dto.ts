import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, IsObject } from 'class-validator';
import { ActivityActorType, ActivityOutcome, AuditActionCategory, AuditRiskLevel } from '../interfaces';

export class RecordAuditLogDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsEnum(ActivityActorType)
  actorType: ActivityActorType;

  @IsString()
  @IsOptional()
  actorId?: string;

  @IsString()
  @IsOptional()
  actorName?: string;

  @IsString()
  @IsOptional()
  actorRole?: string;

  /** Free-form, dot-namespaced, source-module-defined (e.g. 'order.updated'). */
  @IsString()
  @IsNotEmpty()
  action: string;

  @IsEnum(AuditActionCategory)
  actionCategory: AuditActionCategory;

  @IsString()
  @IsNotEmpty()
  module: string;

  @IsString()
  @IsOptional()
  entityType?: string;

  @IsString()
  @IsOptional()
  entityId?: string;

  @IsEnum(ActivityOutcome)
  @IsOptional()
  outcome?: ActivityOutcome;

  @IsString()
  @IsOptional()
  reason?: string;

  /** Safe, sanitized before/after references only — never raw secrets/credentials/tokens. */
  @IsObject()
  @IsOptional()
  beforeState?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  afterState?: Record<string, unknown>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  changedFields?: string[];

  @IsString()
  @IsOptional()
  correlationId?: string;

  @IsString()
  @IsOptional()
  requestId?: string;

  @IsString()
  @IsOptional()
  jobId?: string;

  @IsString()
  @IsOptional()
  workflowId?: string;

  @IsString()
  @IsOptional()
  sessionId?: string;

  @IsString()
  @IsOptional()
  externalRef?: string;

  /** Self-declared risk level; the audit risk analyzer may still escalate this based on recent-activity heuristics. */
  @IsEnum(AuditRiskLevel)
  @IsOptional()
  riskLevel?: AuditRiskLevel;

  @IsString()
  @IsOptional()
  flagReason?: string;

  @IsString()
  @IsOptional()
  dedupeKey?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
