import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  GuardrailStage,
  GuardrailCheckType,
  GuardrailViolationCategory,
} from '../interfaces';

export class GuardrailRuleFilterDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsEnum(GuardrailStage)
  @IsOptional()
  stage?: GuardrailStage;

  @IsEnum(GuardrailViolationCategory)
  @IsOptional()
  category?: GuardrailViolationCategory;

  @IsEnum(GuardrailCheckType)
  @IsOptional()
  checkType?: GuardrailCheckType;

  @IsString()
  @IsOptional()
  capability?: string;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

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
