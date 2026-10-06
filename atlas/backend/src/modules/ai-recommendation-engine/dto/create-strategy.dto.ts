import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
  IsInt,
  Min,
} from 'class-validator';

export class CreateStrategyDto {
  @IsString()
  @IsOptional()
  workspaceId?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  recommendationType!: string;

  @IsString()
  @IsNotEmpty()
  strategy!: string;

  @IsString()
  @IsOptional()
  capability?: string;

  @IsString()
  @IsOptional()
  useCase?: string;

  @IsObject()
  @IsNotEmpty()
  strategyConfig: unknown;

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
