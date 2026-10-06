import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { GuardrailOverrideScope } from '../interfaces';

export class GuardrailOverrideFilterDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsEnum(GuardrailOverrideScope)
  @IsOptional()
  scope?: GuardrailOverrideScope;

  @IsString()
  @IsOptional()
  ruleId?: string;

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
