import { ArrayMinSize, IsArray, IsIn, IsOptional, IsString } from 'class-validator';
import { OAUTH_GRANT_TYPES } from '../constants';

export class UpdateOAuthClientDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @IsOptional()
  redirectUris?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scopes?: string[];

  @IsArray()
  @IsIn(OAUTH_GRANT_TYPES, { each: true })
  @ArrayMinSize(1)
  @IsOptional()
  grantTypes?: string[];

  @IsString()
  @IsOptional()
  environment?: string;

  @IsString()
  @IsOptional()
  authorizationEndpoint?: string;

  @IsString()
  @IsOptional()
  tokenEndpoint?: string;

  @IsString()
  @IsOptional()
  revocationEndpoint?: string;

  @IsString()
  @IsOptional()
  userInfoEndpoint?: string;
}
