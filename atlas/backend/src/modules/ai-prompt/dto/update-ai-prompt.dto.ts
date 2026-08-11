import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AiPromptType, AiPromptStatus } from '../interfaces';

export class UpdateAiPromptDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(AiPromptType)
  type?: AiPromptType;

  @IsOptional()
  @IsString()
  useCase?: string;

  @IsOptional()
  @IsString()
  capability?: string;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @IsString()
  template?: string;

  @IsOptional()
  @IsArray()
  variables?: string[];

  @IsOptional()
  @IsArray()
  requiredVariables?: string[];

  @IsOptional()
  @IsObject()
  inputSchema?: unknown;

  @IsOptional()
  @IsObject()
  outputSchema?: unknown;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsObject()
  modelOverrides?: unknown;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  effectiveFrom?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  effectiveUntil?: Date;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
