import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import {
  GuardrailIncidentStatus,
  GuardrailSeverity,
  GuardrailViolationCategory,
} from '../interfaces';

export class GuardrailIncidentFilterDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsEnum(GuardrailIncidentStatus)
  @IsOptional()
  status?: GuardrailIncidentStatus;

  @IsEnum(GuardrailSeverity)
  @IsOptional()
  severity?: GuardrailSeverity;

  @IsEnum(GuardrailViolationCategory)
  @IsOptional()
  category?: GuardrailViolationCategory;

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
