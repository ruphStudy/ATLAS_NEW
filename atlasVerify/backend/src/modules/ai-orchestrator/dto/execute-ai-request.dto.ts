import { IsString, IsOptional, IsEnum, IsInt, IsObject, Min, Max } from 'class-validator';
import { AiExecutionMode, AiRoutingStrategy } from '../interfaces';

export class ExecuteAiRequestDto {
  @IsString()
  workspaceId: string;

  @IsString()
  useCase: string;

  @IsString()
  capability: string;

  @IsString()
  prompt: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(AiExecutionMode)
  executionMode?: AiExecutionMode;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  priority?: number;

  @IsOptional()
  @IsEnum(AiRoutingStrategy)
  routingStrategy?: AiRoutingStrategy;

  @IsOptional()
  @IsObject()
  routingCriteria?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  maxRetries?: number;

  @IsOptional()
  @IsInt()
  @Min(1000)
  timeout?: number;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsObject()
  requestMetadata?: Record<string, unknown>;
}
