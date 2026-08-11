import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PluginActivationStatus } from '../interfaces';
import { PLUGIN_ACTIVATION_SORT_FIELDS } from '../constants';

export class PluginActivationFilterDto {
  @IsEnum(PluginActivationStatus)
  @IsOptional()
  status?: PluginActivationStatus;

  @IsString()
  @IsOptional()
  appKey?: string;

  @IsIn(PLUGIN_ACTIVATION_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof PLUGIN_ACTIVATION_SORT_FIELDS)[number];

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
