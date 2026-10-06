import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { OAuthClientStatus, OAuthScopeType } from '../interfaces';
import { OAUTH_CLIENT_SORT_FIELDS } from '../constants';

export class OAuthClientFilterDto {
  @IsEnum(OAuthScopeType)
  @IsOptional()
  scopeType?: OAuthScopeType;

  @IsEnum(OAuthClientStatus)
  @IsOptional()
  status?: OAuthClientStatus;

  @IsString()
  @IsOptional()
  providerKey?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsIn(OAUTH_CLIENT_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof OAUTH_CLIENT_SORT_FIELDS)[number];

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
