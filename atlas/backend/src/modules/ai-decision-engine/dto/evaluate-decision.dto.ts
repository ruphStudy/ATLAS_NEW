import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AiDecisionType, AiDecisionMethod } from '../interfaces';

export class EvaluateDecisionDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsEnum(AiDecisionType)
  @IsNotEmpty()
  decisionType!: AiDecisionType;

  @IsEnum(AiDecisionMethod)
  @IsNotEmpty()
  decisionMethod!: AiDecisionMethod;

  @IsNotEmpty()
  inputSnapshot: unknown;

  @IsArray()
  @IsNotEmpty()
  candidates!: unknown[];

  @IsObject()
  @IsOptional()
  constraints?: unknown;

  @IsObject()
  @IsOptional()
  objectives?: unknown;

  @IsString()
  @IsOptional()
  capability?: string;

  @IsString()
  @IsOptional()
  useCase?: string;

  @IsString()
  @IsOptional()
  context?: string;

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
  validationId?: string;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  expiresAt?: Date;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  metadata?: unknown;
}
