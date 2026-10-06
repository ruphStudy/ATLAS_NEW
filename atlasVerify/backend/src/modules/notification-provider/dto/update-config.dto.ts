import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
  IsArray,
  IsDateString,
  IsObject,
} from 'class-validator';

export class UpdateProviderConfigDto {
  @IsString()
  @IsOptional()
  name?: string;

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
  changeReason?: string;

  @IsString()
  @IsOptional()
  changedBy?: string;
}
