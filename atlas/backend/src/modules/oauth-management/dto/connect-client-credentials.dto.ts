import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { OAuthScopeType } from '../interfaces';

export class ConnectClientCredentialsDto {
  @IsEnum(OAuthScopeType)
  scopeType!: OAuthScopeType;

  /** Required for ORGANIZATION scope. */
  @IsString()
  @IsOptional()
  organizationId?: string;

  /** Required for SERVICE_ACCOUNT scope. */
  @IsString()
  @IsOptional()
  serviceAccountHandle?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scopes?: string[];
}
