import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsObject,
} from 'class-validator';
import { GuardrailDecision, GuardrailSeverity } from '../interfaces';

export class UpdateGuardrailOverrideDto {
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
  updatedBy?: string;
}
