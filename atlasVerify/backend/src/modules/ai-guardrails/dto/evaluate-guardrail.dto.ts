import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsObject,
} from 'class-validator';
import { GuardrailStage } from '../interfaces';

export class EvaluateGuardrailDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsEnum(GuardrailStage)
  stage: GuardrailStage;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  capability?: string;

  @IsString()
  @IsOptional()
  useCase?: string;

  @IsString()
  @IsOptional()
  modelProvider?: string;

  @IsString()
  @IsOptional()
  modelId?: string;

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
  toolName?: string;

  @IsString()
  @IsOptional()
  actionName?: string;

  @Min(0)
  @IsInt()
  @IsOptional()
  actionCount?: number;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  userRole?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
