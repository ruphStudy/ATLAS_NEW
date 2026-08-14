import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { AuditRiskLevel } from '@modules/audit-logs/interfaces';
import { SaasIncidentStatus, SaasIncidentType } from '../interfaces';
import { SAAS_AUDIT_INCIDENT_SORT_FIELDS } from '../constants';

export class SaasIncidentFilterDto {
  @IsEnum(SaasIncidentType)
  @IsOptional()
  incidentType?: SaasIncidentType;

  @IsEnum(SaasIncidentStatus)
  @IsOptional()
  status?: SaasIncidentStatus;

  @IsEnum(AuditRiskLevel)
  @IsOptional()
  severity?: AuditRiskLevel;

  @IsString()
  @IsOptional()
  workspaceId?: string;

  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsString()
  @IsOptional()
  actorId?: string;

  @IsIn(SAAS_AUDIT_INCIDENT_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof SAAS_AUDIT_INCIDENT_SORT_FIELDS)[number];

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
