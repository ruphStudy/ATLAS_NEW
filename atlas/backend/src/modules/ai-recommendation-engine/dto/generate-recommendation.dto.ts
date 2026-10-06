import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  IsDate,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AiRecommendationType, AiRecommendationStrategy } from '../interfaces';

export class GenerateRecommendationDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsEnum(AiRecommendationType)
  @IsNotEmpty()
  recommendationType!: AiRecommendationType;

  @IsEnum(AiRecommendationStrategy)
  @IsNotEmpty()
  strategy!: AiRecommendationStrategy;

  @IsNotEmpty()
  inputSnapshot: unknown;

  @IsArray()
  @IsNotEmpty()
  candidates!: unknown[];

  @IsObject()
  @IsOptional()
  objectives?: unknown;

  @IsObject()
  @IsOptional()
  constraints?: unknown;

  @IsObject()
  @IsOptional()
  userPreferences?: unknown;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsBoolean()
  @IsOptional()
  personalized?: boolean;

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
  decisionId?: string;

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
