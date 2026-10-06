import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { QuotaOverrideStatus } from '../interfaces';
import { QUOTA_OVERRIDE_SORT_FIELDS } from '../constants';

export class QuotaOverrideFilterDto {
  @IsEnum(QuotaOverrideStatus)
  @IsOptional()
  status?: QuotaOverrideStatus;

  @IsString()
  @IsOptional()
  resourceKey?: string;

  @IsIn(QUOTA_OVERRIDE_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof QUOTA_OVERRIDE_SORT_FIELDS)[number];

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
