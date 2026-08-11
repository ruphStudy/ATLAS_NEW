import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsBoolean, IsArray, IsObject } from 'class-validator';
import { AiCacheScope, AiCacheStrategy } from '../interfaces';

export class CreateCachePolicyDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(AiCacheScope)
  @IsNotEmpty()
  scope: AiCacheScope;

  @IsEnum(AiCacheStrategy)
  @IsNotEmpty()
  strategy: AiCacheStrategy;

  @IsString()
  @IsOptional()
  capability?: string;

  @IsString()
  @IsOptional()
  useCase?: string;

  @IsString()
  @IsOptional()
  provider?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsNumber()
  @IsOptional()
  priority?: number;

  @IsNumber()
  @IsNotEmpty()
  ttlSeconds: number;

  @IsNumber()
  @IsOptional()
  staleTtlSeconds?: number;

  @IsBoolean()
  @IsOptional()
  enableSemanticCache?: boolean;

  @IsNumber()
  @IsOptional()
  semanticThreshold?: number;

  @IsBoolean()
  @IsOptional()
  enablePartialCache?: boolean;

  @IsBoolean()
  @IsOptional()
  enableStaleRevalidate?: boolean;

  @IsBoolean()
  @IsOptional()
  revalidateAsync?: boolean;

  @IsBoolean()
  @IsOptional()
  enableWarmup?: boolean;

  @IsString()
  @IsOptional()
  warmupSchedule?: string;

  @IsBoolean()
  @IsOptional()
  bypassOnError?: boolean;

  @IsBoolean()
  @IsOptional()
  bypassOnSensitive?: boolean;

  @IsBoolean()
  @IsOptional()
  invalidateOnPromptChange?: boolean;

  @IsBoolean()
  @IsOptional()
  invalidateOnModelChange?: boolean;

  @IsBoolean()
  @IsOptional()
  invalidateOnProviderChange?: boolean;

  @IsBoolean()
  @IsOptional()
  invalidateOnConfigChange?: boolean;

  @IsBoolean()
  @IsOptional()
  invalidateOnDataChange?: boolean;

  @IsNumber()
  @IsOptional()
  maxCacheSize?: number;

  @IsString()
  @IsOptional()
  evictionStrategy?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
