import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  IsInt,
  Min,
} from 'class-validator';
import { AiWorkflowTriggerType, AiWorkflowStatus } from '../interfaces';

export class UpdateAiWorkflowDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(AiWorkflowTriggerType)
  triggerType?: AiWorkflowTriggerType;

  @IsOptional()
  @IsObject()
  triggerConfig?: unknown;

  @IsOptional()
  @IsArray()
  steps?: unknown[];

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
}
