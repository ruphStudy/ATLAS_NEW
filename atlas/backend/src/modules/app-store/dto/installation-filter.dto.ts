import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { AppInstallationStatus } from '../interfaces';
import { APP_INSTALLATION_SORT_FIELDS } from '../constants';

export class AppInstallationFilterDto {
  @IsEnum(AppInstallationStatus)
  @IsOptional()
  status?: AppInstallationStatus;

  @IsString()
  @IsOptional()
  appKey?: string;

  @IsIn(APP_INSTALLATION_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof APP_INSTALLATION_SORT_FIELDS)[number];

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
