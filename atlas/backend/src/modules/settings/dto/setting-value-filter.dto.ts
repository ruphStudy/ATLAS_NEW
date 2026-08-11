import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { SettingScope, SettingValueStatus } from '../interfaces';
import { SETTING_VALUE_SORT_FIELDS } from '../constants';

export class SettingValueFilterDto {
  @IsString()
  @IsOptional()
  definitionKey?: string;

  @IsEnum(SettingScope)
  @IsOptional()
  scope?: SettingScope;

  @IsString()
  @IsOptional()
  moduleKey?: string;

  @IsEnum(SettingValueStatus)
  @IsOptional()
  status?: SettingValueStatus;

  @IsIn(SETTING_VALUE_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof SETTING_VALUE_SORT_FIELDS)[number];

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
