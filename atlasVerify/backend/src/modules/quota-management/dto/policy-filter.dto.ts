import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { QuotaPolicyStatus, QuotaScopeType } from '../interfaces';
import { QUOTA_POLICY_SORT_FIELDS } from '../constants';

export class QuotaPolicyFilterDto {
  @IsEnum(QuotaScopeType)
  @IsOptional()
  scopeType?: QuotaScopeType;

  @IsEnum(QuotaPolicyStatus)
  @IsOptional()
  status?: QuotaPolicyStatus;

  @IsString()
  @IsOptional()
  resourceKey?: string;

  @IsIn(QUOTA_POLICY_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof QUOTA_POLICY_SORT_FIELDS)[number];

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
