import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { RoleType, RoleStatus } from '../interfaces';
import { ROLE_SORT_FIELDS } from '../constants';

export class RoleFilterDto {
  @IsEnum(RoleType)
  @IsOptional()
  type?: RoleType;

  @IsEnum(RoleStatus)
  @IsOptional()
  status?: RoleStatus;

  @IsString()
  @IsOptional()
  search?: string;

  @IsIn(ROLE_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof ROLE_SORT_FIELDS)[number];

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
