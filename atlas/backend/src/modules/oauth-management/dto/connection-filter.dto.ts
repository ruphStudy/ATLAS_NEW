import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { OAuthConnectionStatus, OAuthScopeType } from '../interfaces';
import { OAUTH_CONNECTION_SORT_FIELDS } from '../constants';

export class OAuthConnectionFilterDto {
  @IsEnum(OAuthScopeType)
  @IsOptional()
  scopeType?: OAuthScopeType;

  @IsEnum(OAuthConnectionStatus)
  @IsOptional()
  status?: OAuthConnectionStatus;

  @IsString()
  @IsOptional()
  providerKey?: string;

  @IsString()
  @IsOptional()
  clientId?: string;

  @IsIn(OAUTH_CONNECTION_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof OAUTH_CONNECTION_SORT_FIELDS)[number];

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
