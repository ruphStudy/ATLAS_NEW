import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsBoolean,
  IsArray,
  IsObject,
  Min,
} from 'class-validator';

export class UpdateFallbackConfigDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  capability?: string;

  @IsString()
  @IsOptional()
  useCase?: string;

  @IsString()
  @IsOptional()
  sourceProvider?: string;

  @IsString()
  @IsOptional()
  sourceModel?: string;

  @IsString()
  @IsOptional()
  fallbackProvider?: string;

  @IsString()
  @IsOptional()
  fallbackModel?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  priority?: number;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  triggerFailureTypes?: string[];

  @IsNumber()
  @IsOptional()
  costThreshold?: number;

  @IsInt()
  @IsOptional()
  latencyThreshold?: number;

  @IsBoolean()
  @IsOptional()
  requireHealthCheck?: boolean;

  @IsBoolean()
  @IsOptional()
  requireBudget?: boolean;

  @IsString()
  @IsOptional()
  region?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  metadata?: unknown;
}
