import { IsArray, IsBoolean, IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateFeatureFlagDefinitionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

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
