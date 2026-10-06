import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { AiModelStatus, AiModelCapability } from '../interfaces';

export class AiModelFilterDto {
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsEnum(AiModelStatus)
  status?: AiModelStatus;

  @IsOptional()
  @IsString()
  capability?: string;

  @IsOptional()
  @IsString()
  modality?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsBoolean()
  supportsStreaming?: boolean;

  @IsOptional()
  @IsBoolean()
  supportsJsonMode?: boolean;

  @IsOptional()
  @IsBoolean()
  supportsFunctionCalling?: boolean;

  @IsOptional()
  @IsBoolean()
  supportsVision?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}

export class ModelResolutionDto {
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsEnum(AiModelCapability)
  capability?: AiModelCapability;

  @IsOptional()
  @IsString()
  useCase?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minQualityScore?: number;

  @IsOptional()
  @IsBoolean()
  requiresStreaming?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresJsonMode?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresFunctionCalling?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresVision?: boolean;
}

export class ModelConfigurationFilterDto {
  @IsString()
  workspaceId!: string;

  @IsOptional()
  @IsString()
  modelId?: string;

  @IsOptional()
  @IsString()
  capability?: string;

  @IsOptional()
  @IsString()
  useCase?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
