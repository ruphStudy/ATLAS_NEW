import { IsArray, IsDateString, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class UpdateApiKeyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

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
