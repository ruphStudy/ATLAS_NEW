import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { OAuthScopeType } from '../interfaces';

export class AuthorizeConnectionDto {
  @IsEnum(OAuthScopeType)
  scopeType!: OAuthScopeType;

  /** Required for ORGANIZATION scope. */
  @IsString()
  @IsOptional()
  organizationId?: string;

  /** Required for SERVICE_ACCOUNT scope — no ServiceAccount entity exists in this codebase, so this is a free-form identifier (mirrors API Key Management's convention). */
  @IsString()
  @IsOptional()
  serviceAccountHandle?: string;

  /** Must be one of the client's registered `redirectUris` — defaults to the client's first registered URI when omitted. */
  @IsString()
  @IsOptional()
  redirectUri?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scopes?: string[];
}
