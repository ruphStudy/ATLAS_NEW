import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { AppListingStatus, AppPricingModel, AppPublisherType } from '../interfaces';
import { APP_LISTING_SORT_FIELDS } from '../constants';

export class AppListingFilterDto {
  @IsEnum(AppPublisherType)
  @IsOptional()
  publisherType?: AppPublisherType;

  @IsEnum(AppPricingModel)
  @IsOptional()
  pricingModel?: AppPricingModel;

  @IsEnum(AppListingStatus)
  @IsOptional()
  status?: AppListingStatus;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsIn(APP_LISTING_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof APP_LISTING_SORT_FIELDS)[number];

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
