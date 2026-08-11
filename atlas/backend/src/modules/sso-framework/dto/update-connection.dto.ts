import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { SsoEnforcementPolicy } from '../interfaces';

export class UpdateSsoConnectionDto {
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
  domains?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scopes?: string[];

  @IsEnum(SsoEnforcementPolicy)
  @IsOptional()
  enforcementPolicy?: SsoEnforcementPolicy;

  @IsString()
  @IsOptional()
  issuer?: string;

  @IsString()
  @IsOptional()
  entityId?: string;

  @IsString()
  @IsOptional()
  metadataUrl?: string;

  @IsString()
  @IsOptional()
  ssoUrl?: string;

  @IsString()
  @IsOptional()
  sloUrl?: string;

  @IsString()
  @IsOptional()
  authorizationEndpoint?: string;

  @IsString()
  @IsOptional()
  tokenEndpoint?: string;

  @IsString()
  @IsOptional()
  jwksUri?: string;

  @IsString()
  @IsOptional()
  userInfoEndpoint?: string;

  @IsString()
  @IsOptional()
  endSessionEndpoint?: string;

  @IsBoolean()
  @IsOptional()
  jitProvisioningEnabled?: boolean;

  @IsString()
  @IsOptional()
  groupClaimName?: string;

  @IsString()
  @IsOptional()
  defaultRoleId?: string;
}
