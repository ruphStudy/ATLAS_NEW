import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, IsObject } from 'class-validator';
import { AiCacheScope, AiCacheStrategy } from '../interfaces';

export class CacheLookupDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsNotEmpty()
  capability: string;

  @IsString()
  @IsOptional()
  useCase?: string;

  @IsString()
  @IsNotEmpty()
  provider: string;

  @IsString()
  @IsNotEmpty()
  model: string;

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

  @IsEnum(AiCacheScope)
  @IsOptional()
  scope?: AiCacheScope;

  @IsEnum(AiCacheStrategy)
  @IsOptional()
  strategy?: AiCacheStrategy;

  @IsBoolean()
  @IsOptional()
  bypassCache?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
