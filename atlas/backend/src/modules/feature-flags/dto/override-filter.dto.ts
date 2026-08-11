import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { FeatureFlagOverrideStatus, FeatureFlagScopeType } from '../interfaces';
import { FEATURE_FLAG_OVERRIDE_SORT_FIELDS } from '../constants';

export class FeatureFlagOverrideFilterDto {
  @IsEnum(FeatureFlagScopeType)
  @IsOptional()
  scope?: FeatureFlagScopeType;

  @IsEnum(FeatureFlagOverrideStatus)
  @IsOptional()
  status?: FeatureFlagOverrideStatus;

  @IsIn(FEATURE_FLAG_OVERRIDE_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof FEATURE_FLAG_OVERRIDE_SORT_FIELDS)[number];

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
