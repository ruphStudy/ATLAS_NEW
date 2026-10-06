import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsNumber,
  Min,
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

export class CreateGuardrailRuleDto {
  @IsString()
  @IsOptional()
  workspaceId?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(GuardrailStage)
  stage: GuardrailStage;

  @IsEnum(GuardrailViolationCategory)
  category: GuardrailViolationCategory;

  @IsEnum(GuardrailCheckType)
  checkType: GuardrailCheckType;

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
  @IsNotEmpty()
  config: Record<string, unknown>;

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
  createdBy?: string;
}
