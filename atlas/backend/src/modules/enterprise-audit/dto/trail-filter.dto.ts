import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ActivityActorType, ActivityOutcome, AuditActionCategory, AuditRiskLevel } from '@modules/audit-logs/interfaces';

/**
 * Organization-scoped equivalent of Audit Logs' own `AuditLogFilterDto` /
 * SaaS Audit's `SaasAuditTrailFilterDto` — same filterable fields, plus
 * `businessId` (Multi-Business dimensional tag) and an optional
 * `workspaceId` to narrow to one workspace inside the caller's own
 * organization (never a cross-organization value — enforced separately by
 * `EnterpriseAuditValidator.assertOrganizationBoundary`).
 */
export class EnterpriseAuditTrailFilterDto {
  @IsString()
  @IsOptional()
  workspaceId?: string;

  @IsString()
  @IsOptional()
  businessId?: string;

  @IsString()
  @IsOptional()
  module?: string;

  @IsString()
  @IsOptional()
  action?: string;

  @IsEnum(AuditActionCategory)
  @IsOptional()
  actionCategory?: AuditActionCategory;

  @IsEnum(ActivityActorType)
  @IsOptional()
  actorType?: ActivityActorType;

  @IsString()
  @IsOptional()
  actorId?: string;

  @IsString()
  @IsOptional()
  entityType?: string;

  @IsString()
  @IsOptional()
  entityId?: string;

  @IsEnum(ActivityOutcome)
  @IsOptional()
  outcome?: ActivityOutcome;

  @IsEnum(AuditRiskLevel)
  @IsOptional()
  riskLevel?: AuditRiskLevel;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  flagged?: boolean;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  page?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(200)
  limit?: number;
}
