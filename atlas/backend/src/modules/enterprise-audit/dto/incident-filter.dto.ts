import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { AuditRiskLevel } from '@modules/audit-logs/interfaces';
import { SaasIncidentStatus, SaasIncidentType } from '@modules/saas-audit/interfaces';

/** Organization-scoped equivalent of SaaS Audit's `SaasIncidentFilterDto` — the `organizationId` narrowing is applied by `EnterpriseAuditService`, never caller-suppliable here. */
export class EnterpriseIncidentFilterDto {
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
  actorId?: string;

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
