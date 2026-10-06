import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { SsoConnectionStatus, SsoProtocol, SsoScopeType } from '../interfaces';
import { SSO_CONNECTION_SORT_FIELDS } from '../constants';

export class SsoConnectionFilterDto {
  @IsEnum(SsoScopeType)
  @IsOptional()
  scopeType?: SsoScopeType;

  @IsEnum(SsoProtocol)
  @IsOptional()
  protocol?: SsoProtocol;

  @IsEnum(SsoConnectionStatus)
  @IsOptional()
  status?: SsoConnectionStatus;

  @IsString()
  @IsOptional()
  search?: string;

  @IsIn(SSO_CONNECTION_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof SSO_CONNECTION_SORT_FIELDS)[number];

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
