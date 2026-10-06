import {
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsObject,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  IGeminiContent,
  IGeminiTool,
  IGeminiSafetySettings,
  GeminiModel,
  GeminiCapability,
  GeminiExecutionMode,
} from '../interfaces';

export class GeminiExecuteDto {
  @IsString()
  workspaceId!: string;

  @IsEnum(GeminiModel)
  model!: string;

  @IsEnum(GeminiCapability)
  capability!: string;

  @IsArray()
  contents!: IGeminiContent[];

  @IsOptional()
  @IsString()
  systemInstruction?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  topP?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  topK?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(8192)
  maxOutputTokens?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stopSequences?: string[];

  @IsOptional()
  @IsString()
  responseMimeType?: string;

  @IsOptional()
  @IsObject()
  responseSchema?: Record<string, any>;

  @IsOptional()
  @IsArray()
  tools?: IGeminiTool[];

  @IsOptional()
  @IsArray()
  safetySettings?: IGeminiSafetySettings[];

  @IsOptional()
  @IsNumber()
  @Min(1000)
  timeout?: number;

  @IsOptional()
  @IsString()
  userId?: string;
}
