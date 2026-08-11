import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { SaasAuditArchiveStatus } from '../interfaces';
import { SAAS_AUDIT_ARCHIVE_SORT_FIELDS } from '../constants';

export class SaasAuditArchiveFilterDto {
  @IsString()
  @IsOptional()
  workspaceId?: string;

  @IsEnum(SaasAuditArchiveStatus)
  @IsOptional()
  status?: SaasAuditArchiveStatus;

  @IsIn(SAAS_AUDIT_ARCHIVE_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof SAAS_AUDIT_ARCHIVE_SORT_FIELDS)[number];

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
