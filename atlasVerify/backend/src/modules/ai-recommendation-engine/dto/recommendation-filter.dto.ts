import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AiRecommendationStatus, AiRecommendationType } from '../interfaces';

export class RecommendationFilterDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsEnum(AiRecommendationStatus)
  @IsOptional()
  status?: AiRecommendationStatus;

  @IsEnum(AiRecommendationType)
  @IsOptional()
  recommendationType?: AiRecommendationType;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  capability?: string;

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

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  page?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;
}
