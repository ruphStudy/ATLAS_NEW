import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiKeyScopeType, ApiKeyStatus } from '../interfaces';
import { API_KEY_SORT_FIELDS } from '../constants';

export class ApiKeyFilterDto {
  @IsEnum(ApiKeyScopeType)
  @IsOptional()
  scopeType?: ApiKeyScopeType;

  @IsEnum(ApiKeyStatus)
  @IsOptional()
  status?: ApiKeyStatus;

  @IsString()
  @IsOptional()
  search?: string;

  @IsIn(API_KEY_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof API_KEY_SORT_FIELDS)[number];

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
