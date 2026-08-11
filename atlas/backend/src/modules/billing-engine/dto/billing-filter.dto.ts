import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { BillingPeriodStatus } from '../interfaces';
import { BILLING_SORT_FIELDS } from '../constants';

export class BillingFilterDto {
  @IsString()
  @IsOptional()
  subscriptionId?: string;

  @IsEnum(BillingPeriodStatus)
  @IsOptional()
  status?: BillingPeriodStatus;

  @IsIn(BILLING_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof BILLING_SORT_FIELDS)[number];

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
