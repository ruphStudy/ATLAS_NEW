import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { EnterpriseHealthIncidentStatus, EnterpriseHealthScope, MonitoringAlertSeverity } from '../interfaces';

/** Organization-scoped filter for `EnterpriseHealthIncident` — the `organizationId` narrowing is applied by `EnterpriseHealthService`, never caller-suppliable here. */
export class EnterpriseHealthIncidentFilterDto {
  @IsEnum(EnterpriseHealthScope)
  @IsOptional()
  scope?: EnterpriseHealthScope;

  @IsString()
  @IsOptional()
  scopeRef?: string;

  @IsEnum(EnterpriseHealthIncidentStatus)
  @IsOptional()
  status?: EnterpriseHealthIncidentStatus;

  @IsEnum(MonitoringAlertSeverity)
  @IsOptional()
  severity?: MonitoringAlertSeverity;

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
