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
import { AiDecisionStatus, AiDecisionType } from '../interfaces';

export class DecisionFilterDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsEnum(AiDecisionStatus)
  @IsOptional()
  status?: AiDecisionStatus;

  @IsEnum(AiDecisionType)
  @IsOptional()
  decisionType?: AiDecisionType;

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
