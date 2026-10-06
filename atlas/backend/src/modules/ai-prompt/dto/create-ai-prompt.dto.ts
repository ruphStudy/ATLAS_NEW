import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  IsInt,
  IsDate,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AiPromptType, AiPromptStatus } from '../interfaces';

export class CreateAiPromptDto {
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsString()
  key!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(AiPromptType)
  type!: AiPromptType;

  @IsString()
  useCase!: string;

  @IsOptional()
  @IsString()
  capability?: string;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsString()
  template!: string;

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
  @IsString()
  parentPromptId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  createdBy?: string;
}
