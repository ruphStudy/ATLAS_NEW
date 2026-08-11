import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { SettingDefinitionStatus } from '../interfaces';
import { SETTING_DEFINITION_SORT_FIELDS } from '../constants';

export class SettingDefinitionFilterDto {
  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  module?: string;

  @IsEnum(SettingDefinitionStatus)
  @IsOptional()
  status?: SettingDefinitionStatus;

  @IsString()
  @IsOptional()
  search?: string;

  @IsIn(SETTING_DEFINITION_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof SETTING_DEFINITION_SORT_FIELDS)[number];

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
