import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsNumber,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { AiModelStatus, AiModelCapability, AiModelModality } from '../interfaces';

export class RegisterAiModelDto {
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsString()
  provider!: string;

  @IsString()
  modelKey!: string;

  @IsString()
  displayName!: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsEnum(AiModelStatus)
  @IsOptional()
  status?: AiModelStatus;

  @IsArray()
  @IsString({ each: true })
  capabilities!: string[];

  @IsArray()
  @IsString({ each: true })
  modalities!: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  contextLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  outputLimit?: number;

  @IsBoolean()
  @IsOptional()
  supportsStreaming?: boolean;

  @IsBoolean()
  @IsOptional()
  supportsJsonMode?: boolean;

  @IsBoolean()
  @IsOptional()
  supportsFunctionCalling?: boolean;

  @IsBoolean()
  @IsOptional()
  supportsVision?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  regions?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricingInputPer1k?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricingOutputPer1k?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  rateLimit?: number;

  @IsOptional()
  @IsString()
  rateLimitWindow?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  averageLatency?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  qualityScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  availabilityScore?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  aliases?: string[];

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  isPreferred?: boolean;

  @IsBoolean()
  @IsOptional()
  isFallback?: boolean;
}

export class UpdateAiModelDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsEnum(AiModelStatus)
  @IsOptional()
  status?: AiModelStatus;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  capabilities?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  modalities?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  contextLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  outputLimit?: number;

  @IsBoolean()
  @IsOptional()
  supportsStreaming?: boolean;

  @IsBoolean()
  @IsOptional()
  supportsJsonMode?: boolean;

  @IsBoolean()
  @IsOptional()
  supportsFunctionCalling?: boolean;

  @IsBoolean()
  @IsOptional()
  supportsVision?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  regions?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricingInputPer1k?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricingOutputPer1k?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  rateLimit?: number;

  @IsOptional()
  @IsString()
  rateLimitWindow?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  averageLatency?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  qualityScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  availabilityScore?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  aliases?: string[];

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  isPreferred?: boolean;

  @IsBoolean()
  @IsOptional()
  isFallback?: boolean;
}
