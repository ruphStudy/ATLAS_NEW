import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { AiCostBudgetScope, AiCostBudgetPeriod } from '../interfaces';

export class CreateBudgetDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsEnum(AiCostBudgetScope)
  scope!: AiCostBudgetScope;

  @IsEnum(AiCostBudgetPeriod)
  period!: AiCostBudgetPeriod;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  feature?: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsNumber()
  @Min(0)
  limitAmount!: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  warningThresholdPercent?: number;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  createdBy?: string;
}
