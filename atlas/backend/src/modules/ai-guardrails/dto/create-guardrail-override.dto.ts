import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsObject,
} from 'class-validator';
import {
  GuardrailOverrideScope,
  GuardrailDecision,
  GuardrailSeverity,
} from '../interfaces';

export class CreateGuardrailOverrideDto {
  @IsEnum(GuardrailOverrideScope)
  scope: GuardrailOverrideScope;

  @IsString()
  @IsOptional()
  ruleId?: string;

  @IsString()
  @IsOptional()
  workspaceId?: string;

  @IsString()
  @IsOptional()
  providerKey?: string;

  @IsString()
  @IsOptional()
  modelId?: string;

  @IsBoolean()
  @IsOptional()
  enabledOverride?: boolean;

  @IsEnum(GuardrailDecision)
  @IsOptional()
  decisionOverride?: GuardrailDecision;

  @IsEnum(GuardrailSeverity)
  @IsOptional()
  severityOverride?: GuardrailSeverity;

  @IsInt()
  @IsOptional()
  priority?: number;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  createdBy?: string;
}
