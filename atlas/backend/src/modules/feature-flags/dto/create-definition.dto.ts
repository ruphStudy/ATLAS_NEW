import { IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { FeatureFlagType } from '../interfaces';

export class CreateFeatureFlagDefinitionDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(FeatureFlagType)
  type!: FeatureFlagType;

  @IsBoolean()
  @IsOptional()
  defaultEnabled?: boolean;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(100)
  rolloutPercentage?: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  dependencies?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  mutuallyExclusiveWith?: string[];

  @IsInt()
  @IsOptional()
  priority?: number;

  @IsString()
  @IsOptional()
  owner?: string;
}
