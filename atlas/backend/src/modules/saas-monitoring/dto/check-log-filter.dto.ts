import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SaasHealthCheckLogFilterDto {
  @IsString()
  @IsOptional()
  module?: string;

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
