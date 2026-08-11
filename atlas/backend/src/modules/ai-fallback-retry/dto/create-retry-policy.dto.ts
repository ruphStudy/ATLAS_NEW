import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { AiBackoffStrategy } from '../interfaces';

export class CreateRetryPolicyDto {
  @IsString()
  @IsOptional()
  workspaceId?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  capability?: string;

  @IsString()
  @IsOptional()
  useCase?: string;

  @IsString()
  @IsOptional()
  modelProvider?: string;

  @IsInt()
  @Min(0)
  @Max(10)
  @IsOptional()
  maxRetries?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  initialDelayMs?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  maxDelayMs?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  backoffMultiplier?: number;

  @IsEnum(AiBackoffStrategy)
  @IsOptional()
  backoffStrategy?: AiBackoffStrategy;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  jitterFactor?: number;

  @IsInt()
  @IsOptional()
  timeoutMs?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  retryableFailures?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  nonRetryableFailures?: string[];

  @IsBoolean()
  @IsOptional()
  enableFallback?: boolean;

  @IsInt()
  @IsOptional()
  fallbackPriority?: number;

  @IsBoolean()
  @IsOptional()
  respectBudget?: boolean;

  @IsBoolean()
  @IsOptional()
  respectQuota?: boolean;

  @IsBoolean()
  @IsOptional()
  respectCircuitBreaker?: boolean;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsInt()
  @IsOptional()
  priority?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  metadata?: unknown;
}
