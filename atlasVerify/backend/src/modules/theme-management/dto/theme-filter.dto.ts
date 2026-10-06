import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ThemeScope, ThemeStatus } from '../interfaces';
import { THEME_SORT_FIELDS } from '../constants';

export class ThemeFilterDto {
  @IsEnum(ThemeScope)
  @IsOptional()
  scope?: ThemeScope;

  @IsEnum(ThemeStatus)
  @IsOptional()
  status?: ThemeStatus;

  @IsString()
  @IsOptional()
  search?: string;

  @IsIn(THEME_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof THEME_SORT_FIELDS)[number];

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
