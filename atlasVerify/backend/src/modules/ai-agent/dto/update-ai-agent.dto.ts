import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsNumber,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { AiAgentType, AiAgentStatus } from '../interfaces';

export class UpdateAiAgentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(AiAgentType)
  type?: AiAgentType;

  @IsOptional()
  @IsEnum(AiAgentStatus)
  status?: AiAgentStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  capabilities?: string[];

  @IsOptional()
  @IsString()
  primaryCapability?: string;

  @IsOptional()
  @IsString()
  persona?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  @IsString()
  modelId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTokens?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  topP?: number;

  @IsOptional()
  @IsArray()
  tools?: unknown[];

  @IsOptional()
  @IsString()
  toolChoice?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  contextWindowSize?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTurns?: number;

  @IsOptional()
  @IsBoolean()
  enableMemory?: boolean;

  @IsOptional()
  @IsBoolean()
  enableContext?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1000)
  timeout?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  maxRetries?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
