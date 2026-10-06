import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ActivityActorType, ActivityOutcome, AuditActionCategory, AuditRiskLevel } from '@modules/audit-logs/interfaces';

/** Cross-tenant equivalent of Audit Logs' own `AuditLogFilterDto` — same filterable fields, plus optional `workspaceId`/`organizationId` narrowing since this search is platform-wide by default (see `PlatformAdminGuard` on every route in this module). */
export class SaasAuditTrailFilterDto {
  @IsString()
  @IsOptional()
  workspaceId?: string;

  @IsString()
  @IsOptional()
  organizationId?: string;

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
