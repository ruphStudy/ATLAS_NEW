import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ImpersonationStatus } from '../interfaces';
import { IMPERSONATION_SESSION_SORT_FIELDS } from '../constants';

export class ImpersonationSessionFilterDto {
  @IsString()
  @IsOptional()
  adminUserId?: string;

  @IsString()
  @IsOptional()
  targetWorkspaceId?: string;

  @IsEnum(ImpersonationStatus)
  @IsOptional()
  status?: ImpersonationStatus;

  @IsIn(IMPERSONATION_SESSION_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof IMPERSONATION_SESSION_SORT_FIELDS)[number];

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
