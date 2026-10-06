import { IsArray, IsDateString, IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { ApiKeyScopeType } from '../interfaces';

export class CreateApiKeyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ApiKeyScopeType)
  scopeType: ApiKeyScopeType;

  /** Required for ORGANIZATION scope. */
  @IsString()
  @IsOptional()
  organizationId?: string;

  /** Required for USER scope; defaults to the caller for USER-scoped keys when omitted. */
  @IsString()
  @IsOptional()
  ownerUserId?: string;

  /** Required for SERVICE_ACCOUNT scope — no ServiceAccount entity exists in this codebase, so this is a free-form identifier. */
  @IsString()
  @IsOptional()
  serviceAccountHandle?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scopes?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  environments?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  ipAllowlist?: string[];

  @IsInt()
  @IsOptional()
  @Min(1)
  rateLimitPerMinute?: number;

  @IsObject()
  @IsOptional()
  usageRestrictions?: Record<string, unknown>;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
