import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  IsInt,
  Min,
} from 'class-validator';
import { AiWorkflowTriggerType } from '../interfaces';

export class CreateAiWorkflowDto {
  @IsString()
  workspaceId!: string;

  @IsString()
  key!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(AiWorkflowTriggerType)
  triggerType!: AiWorkflowTriggerType;

  @IsOptional()
  @IsObject()
  triggerConfig?: unknown;

  @IsArray()
  steps!: unknown[];

  @IsOptional()
  @IsObject()
  inputSchema?: unknown;

  @IsOptional()
  @IsObject()
  outputSchema?: unknown;

  @IsOptional()
  @IsObject()
  variables?: unknown;

  @IsOptional()
  @IsInt()
  @Min(1000)
  timeout?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxRetries?: number;

  @IsOptional()
  @IsObject()
  retryStrategy?: unknown;

  @IsOptional()
  @IsString()
  fallbackWorkflowId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  createdBy?: string;
}
