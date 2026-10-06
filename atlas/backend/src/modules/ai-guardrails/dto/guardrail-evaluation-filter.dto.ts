import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { GuardrailStage, GuardrailDecision, GuardrailSeverity } from '../interfaces';

export class GuardrailEvaluationFilterDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsEnum(GuardrailStage)
  @IsOptional()
  stage?: GuardrailStage;

  @IsEnum(GuardrailDecision)
  @IsOptional()
  decision?: GuardrailDecision;

  @IsEnum(GuardrailSeverity)
  @IsOptional()
  severity?: GuardrailSeverity;

  @IsString()
  @IsOptional()
  orchestratorRequestId?: string;

  @IsString()
  @IsOptional()
  agentExecutionId?: string;

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
