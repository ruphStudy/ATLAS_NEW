import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { SaasHealthIncidentStatus, SaasHealthStatus } from '../interfaces';

export class SaasHealthIncidentFilterDto {
  @IsString()
  @IsOptional()
  module?: string;

  @IsEnum(SaasHealthIncidentStatus)
  @IsOptional()
  status?: SaasHealthIncidentStatus;

  @IsEnum(SaasHealthStatus)
  @IsOptional()
  severity?: SaasHealthStatus;

  /** Platform-view only — a tenant-scoped caller's workspace is implied by context and this is ignored. */
  @IsString()
  @IsOptional()
  workspaceId?: string;

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
