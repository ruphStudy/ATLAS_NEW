import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { AiCostBudgetScope, AiCostBudgetPeriod } from '../interfaces';

export class BudgetFilterDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsEnum(AiCostBudgetScope)
  @IsOptional()
  scope?: AiCostBudgetScope;

  @IsEnum(AiCostBudgetPeriod)
  @IsOptional()
  period?: AiCostBudgetPeriod;

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
