import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { LicenseScopeType, LicenseStatus, LicenseType } from '../interfaces';
import { LICENSE_SORT_FIELDS } from '../constants';

export class LicenseFilterDto {
  @IsEnum(LicenseScopeType)
  @IsOptional()
  scopeType?: LicenseScopeType;

  @IsEnum(LicenseType)
  @IsOptional()
  type?: LicenseType;

  @IsEnum(LicenseStatus)
  @IsOptional()
  status?: LicenseStatus;

  @IsString()
  @IsOptional()
  search?: string;

  @IsIn(LICENSE_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof LICENSE_SORT_FIELDS)[number];

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
