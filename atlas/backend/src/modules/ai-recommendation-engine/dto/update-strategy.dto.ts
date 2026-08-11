import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
  IsInt,
  Min,
} from 'class-validator';

export class UpdateStrategyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  recommendationType?: string;

  @IsString()
  @IsOptional()
  strategy?: string;

  @IsString()
  @IsOptional()
  capability?: string;

  @IsString()
  @IsOptional()
  useCase?: string;

  @IsObject()
  @IsOptional()
  strategyConfig?: unknown;

  @IsObject()
  @IsOptional()
  weights?: unknown;

  @IsObject()
  @IsOptional()
  thresholds?: unknown;

  @IsInt()
  @IsOptional()
  @Min(0)
  priority?: number;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsBoolean()
  @IsOptional()
  personalizationEnabled?: boolean;

  @IsString()
  @IsOptional()
  version?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  metadata?: unknown;
}
