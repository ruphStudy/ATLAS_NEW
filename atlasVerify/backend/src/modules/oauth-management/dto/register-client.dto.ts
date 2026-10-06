import { ArrayMinSize, IsArray, IsEnum, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { OAuthScopeType } from '../interfaces';
import { OAUTH_GRANT_TYPES } from '../constants';

export class RegisterOAuthClientDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(OAuthScopeType)
  scopeType: OAuthScopeType;

  /** Required for ORGANIZATION scope. */
  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsString()
  @IsNotEmpty()
  providerKey: string;

  /** The client ID as issued by the external provider — not a secret, safe to display. */
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @IsString()
  @IsNotEmpty()
  clientSecret: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  redirectUris: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scopes?: string[];

  @IsArray()
  @IsIn(OAUTH_GRANT_TYPES, { each: true })
  @ArrayMinSize(1)
  grantTypes: string[];

  @IsString()
  @IsOptional()
  environment?: string;

  @IsString()
  @IsNotEmpty()
  authorizationEndpoint: string;

  @IsString()
  @IsNotEmpty()
  tokenEndpoint: string;

  @IsString()
  @IsOptional()
  revocationEndpoint?: string;

  @IsString()
  @IsOptional()
  userInfoEndpoint?: string;
}
