import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { UsageRecordSource } from '../interfaces';
import { USAGE_SORT_FIELDS } from '../constants';

export class UsageFilterDto {
  @IsString()
  @IsOptional()
  resourceKey?: string;

  @IsString()
  @IsOptional()
  module?: string;

  @IsString()
  @IsOptional()
  billingPeriodId?: string;

  @IsString()
  @IsOptional()
  subscriptionId?: string;

  @IsEnum(UsageRecordSource)
  @IsOptional()
  source?: UsageRecordSource;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsIn(USAGE_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof USAGE_SORT_FIELDS)[number];

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
