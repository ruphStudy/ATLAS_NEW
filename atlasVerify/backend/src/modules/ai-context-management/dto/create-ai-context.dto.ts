import {
  IsString,
  IsNotEmpty,
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
  AiContextType,
  AiContextPriority,
} from '../interfaces';

export class CreateAiContextDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsEnum(AiContextType)
  type: AiContextType;

  @IsEnum(AiContextPriority)
  @IsOptional()
  priority?: AiContextPriority;

  @IsString()
  @IsOptional()
  correlationId?: string;

  @IsString()
  @IsOptional()
  parentContextId?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  sessionId?: string;

  @IsString()
  @IsOptional()
  workflowExecutionId?: string;

  @IsString()
  @IsOptional()
  agentExecutionId?: string;

  @IsString()
  @IsOptional()
  taskId?: string;

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

  @IsInt()
  @IsOptional()
  @Min(1)
  maxTokens?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  windowSize?: number;

  @IsString()
  @IsOptional()
  source?: string;

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
}
