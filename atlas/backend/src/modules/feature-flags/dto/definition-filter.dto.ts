import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { FeatureFlagDefinitionStatus, FeatureFlagType } from '../interfaces';
import { FEATURE_FLAG_DEFINITION_SORT_FIELDS } from '../constants';

export class FeatureFlagDefinitionFilterDto {
  @IsEnum(FeatureFlagType)
  @IsOptional()
  type?: FeatureFlagType;

  @IsEnum(FeatureFlagDefinitionStatus)
  @IsOptional()
  status?: FeatureFlagDefinitionStatus;

  @IsString()
  @IsOptional()
  search?: string;

  @IsIn(FEATURE_FLAG_DEFINITION_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof FEATURE_FLAG_DEFINITION_SORT_FIELDS)[number];

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
