import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsObject, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OpenAiExecutionMode } from '../interfaces';

export class OpenAiExecuteDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  model!: string;

  @IsString()
  @IsNotEmpty()
  capability!: string;

  @IsString()
  @IsOptional()
  useCase?: string;

  @IsArray()
  @IsOptional()
  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'object' },
  })
  messages?: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | any[];
    name?: string;
    tool_calls?: any[];
    tool_call_id?: string;
  }>;

  @IsString()
  @IsOptional()
  prompt?: string;

  @IsOptional()
  input?: string | string[];

  @IsNumber()
  @IsOptional()
  temperature?: number;

  @IsNumber()
  @IsOptional()
  maxTokens?: number;

  @IsNumber()
  @IsOptional()
  topP?: number;

  @IsNumber()
  @IsOptional()
  frequencyPenalty?: number;

  @IsNumber()
  @IsOptional()
  presencePenalty?: number;

  @IsNumber()
  @IsOptional()
  n?: number;

  @IsBoolean()
  @IsOptional()
  stream?: boolean;

  @IsOptional()
  stop?: string | string[];

  @IsObject()
  @IsOptional()
  responseFormat?: { type: 'text' | 'json_object' };

  @IsArray()
  @IsOptional()
  tools?: any[];

  @IsOptional()
  toolChoice?: string | object;

  @IsString()
  @IsOptional()
  size?: string;

  @IsString()
  @IsOptional()
  quality?: string;

  @IsString()
  @IsOptional()
  style?: string;

  @IsString()
  @IsOptional()
  orchestratorRequestId?: string;

  @IsString()
  @IsOptional()
  agentExecutionId?: string;

  @IsString()
  @IsOptional()
  workflowExecutionId?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @IsNumber()
  @IsOptional()
  timeout?: number;

  @IsEnum(OpenAiExecutionMode)
  @IsOptional()
  executionMode?: OpenAiExecutionMode;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
