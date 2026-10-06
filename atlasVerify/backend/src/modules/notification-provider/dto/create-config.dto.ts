import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
  IsArray,
  IsDateString,
  IsObject,
} from 'class-validator';

export class CreateProviderConfigDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsNotEmpty()
  providerKey: string;

  @IsString()
  @IsNotEmpty()
  channel: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @IsOptional()
  priority?: number;

  @IsBoolean()
  @IsOptional()
  isFallback?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fallbackProviderKeys?: string[];

  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @IsDateString()
  @IsOptional()
  effectiveTo?: string;

  @IsObject()
  @IsOptional()
  settings?: Record<string, unknown>;

  @IsInt()
  @Min(1)
  @IsOptional()
  timeoutMs?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxRetryAttempts?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  retryBackoffMs?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxRequestsPerMinute?: number;

  @IsString()
  @IsOptional()
  createdBy?: string;
}
