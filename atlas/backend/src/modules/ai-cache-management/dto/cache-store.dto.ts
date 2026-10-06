import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsBoolean, IsArray, IsObject } from 'class-validator';
import { AiCacheScope, AiCacheStrategy } from '../interfaces';

export class CacheStoreDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  capability!: string;

  @IsString()
  @IsOptional()
  useCase?: string;

  @IsString()
  @IsNotEmpty()
  provider!: string;

  @IsString()
  @IsNotEmpty()
  model!: string;

  @IsString()
  @IsOptional()
  promptVersion?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  workflowId?: string;

  @IsString()
  @IsOptional()
  requestId?: string;

  @IsNotEmpty()
  inputData: unknown;

  @IsOptional()
  contextData?: unknown;

  @IsOptional()
  parameters?: unknown;

  @IsNotEmpty()
  response: unknown;

  @IsOptional()
  responseMetadata?: unknown;

  @IsNumber()
  @IsNotEmpty()
  tokensUsed!: number;

  @IsNumber()
  @IsNotEmpty()
  cost!: number;

  @IsNumber()
  @IsNotEmpty()
  latencyMs!: number;

  @IsEnum(AiCacheScope)
  @IsOptional()
  scope?: AiCacheScope;

  @IsEnum(AiCacheStrategy)
  @IsOptional()
  strategy?: AiCacheStrategy;

  @IsBoolean()
  @IsOptional()
  sensitiveData?: boolean;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
