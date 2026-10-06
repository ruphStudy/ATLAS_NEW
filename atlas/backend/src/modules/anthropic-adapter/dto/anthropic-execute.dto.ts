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
  IAnthropicMessage,
  IAnthropicTool,
  AnthropicModel,
  AnthropicCapability,
  AnthropicExecutionMode,
} from '../interfaces';

export class AnthropicExecuteDto {
  @IsString()
  workspaceId!: string;

  @IsEnum(AnthropicModel)
  model!: string;

  @IsEnum(AnthropicCapability)
  capability!: string;

  @IsArray()
  messages!: IAnthropicMessage[];

  @IsNumber()
  @Min(1)
  @Max(200000)
  maxTokens!: number;

  @IsOptional()
  @IsString()
  system?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
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
  @IsArray()
  @IsString({ each: true })
  stopSequences?: string[];

  @IsOptional()
  @IsBoolean()
  stream?: boolean;

  @IsOptional()
  @IsArray()
  tools?: IAnthropicTool[];

  @IsOptional()
  @IsObject()
  toolChoice?: { type: 'auto' | 'any' | 'tool'; name?: string };

  @IsOptional()
  @IsNumber()
  @Min(1000)
  timeout?: number;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
