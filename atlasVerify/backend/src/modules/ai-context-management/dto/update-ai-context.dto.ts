import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsInt,
  IsArray,
  IsBoolean,
  IsDateString,
  Min,
} from 'class-validator';
import {
  AiContextStatus,
  AiContextPriority,
} from '../interfaces';

export class UpdateAiContextDto {
  @IsEnum(AiContextStatus)
  @IsOptional()
  status?: AiContextStatus;

  @IsEnum(AiContextPriority)
  @IsOptional()
  priority?: AiContextPriority;

  @IsObject()
  @IsOptional()
  variables?: unknown;

  @IsArray()
  @IsOptional()
  conversationHistory?: unknown[];

  @IsObject()
  @IsOptional()
  toolResults?: unknown;

  @IsObject()
  @IsOptional()
  businessReferences?: unknown;

  @IsObject()
  @IsOptional()
  executionMetadata?: unknown;

  @IsString()
  @IsOptional()
  summary?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  maxTokens?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  windowSize?: number;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsBoolean()
  @IsOptional()
  allowInheritance?: boolean;

  @IsBoolean()
  @IsOptional()
  allowBranching?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  metadata?: unknown;

  @IsString()
  @IsOptional()
  changeReason?: string;

  @IsString()
  @IsOptional()
  changedBy?: string;
}
