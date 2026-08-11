import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNumber,
  IsArray,
  Min,
  Max,
} from 'class-validator';

export class CreateModelConfigurationDto {
  @IsString()
  workspaceId: string;

  @IsString()
  modelId: string;

  @IsString()
  capability: string;

  @IsOptional()
  @IsString()
  useCase?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  isPreferred?: boolean;

  @IsInt()
  @IsOptional()
  priority?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fallbackModelIds?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  maxRetries?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  timeout?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxTokens?: number;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

export class UpdateModelConfigurationDto {
  @IsOptional()
  @IsString()
  useCase?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  isPreferred?: boolean;

  @IsInt()
  @IsOptional()
  priority?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fallbackModelIds?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  maxRetries?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  timeout?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxTokens?: number;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
