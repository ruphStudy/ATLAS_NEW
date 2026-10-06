import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsNumber,
  IsObject,
  IsArray,
} from 'class-validator';
import {
  GuardrailStage,
  GuardrailCheckType,
  GuardrailViolationCategory,
  GuardrailSeverity,
  GuardrailDecision,
} from '../interfaces';

export class UpdateGuardrailRuleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

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

  @IsString()
  @IsOptional()
  useCase?: string;

  @IsString()
  @IsOptional()
  modelProvider?: string;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsObject()
  @IsOptional()
  config?: Record<string, unknown>;

  @IsEnum(GuardrailSeverity)
  @IsOptional()
  severity?: GuardrailSeverity;

  @IsEnum(GuardrailDecision)
  @IsOptional()
  decision?: GuardrailDecision;

  @IsNumber()
  @IsOptional()
  riskWeight?: number;

  @IsBoolean()
  @IsOptional()
  requiresApproval?: boolean;

  @IsInt()
  @IsOptional()
  priority?: number;

  @IsBoolean()
  @IsOptional()
  stopOnMatch?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  changeReason?: string;

  @IsString()
  @IsOptional()
  changedBy?: string;
}
