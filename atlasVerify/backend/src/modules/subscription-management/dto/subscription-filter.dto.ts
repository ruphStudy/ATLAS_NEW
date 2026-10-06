import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { SubscriptionScope, SubscriptionStatus, SubscriptionType } from '../interfaces';
import { SUBSCRIPTION_SORT_FIELDS } from '../constants';

export class SubscriptionFilterDto {
  @IsEnum(SubscriptionScope)
  @IsOptional()
  scope?: SubscriptionScope;

  @IsEnum(SubscriptionStatus)
  @IsOptional()
  status?: SubscriptionStatus;

  @IsEnum(SubscriptionType)
  @IsOptional()
  type?: SubscriptionType;

  @IsString()
  @IsOptional()
  planKey?: string;

  @IsIn(SUBSCRIPTION_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof SUBSCRIPTION_SORT_FIELDS)[number];

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
