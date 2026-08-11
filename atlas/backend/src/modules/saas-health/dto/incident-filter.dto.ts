import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { SaasHealthAggregateIncidentStatus, SaasHealthLevel } from '../interfaces';

export class SaasHealthAggregateIncidentFilterDto {
  @IsEnum(SaasHealthAggregateIncidentStatus)
  @IsOptional()
  status?: SaasHealthAggregateIncidentStatus;

  @IsEnum(SaasHealthLevel)
  @IsOptional()
  severity?: SaasHealthLevel;

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
