import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { LocaleDirection, LocaleStatus } from '../interfaces';
import { LOCALE_SORT_FIELDS } from '../constants';

export class LocaleFilterDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(LocaleStatus)
  @IsOptional()
  status?: LocaleStatus;

  @IsEnum(LocaleDirection)
  @IsOptional()
  direction?: LocaleDirection;

  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  script?: string;

  @IsIn(LOCALE_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof LOCALE_SORT_FIELDS)[number];

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
