import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PlanOverageRule } from '../interfaces';

export class PlanLimitDto {
  @IsString()
  @IsNotEmpty()
  resourceKey: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  soft?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  hard?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  graceThreshold?: number;

  @IsEnum(PlanOverageRule)
  @IsOptional()
  overageRule?: PlanOverageRule;
}
