import { IsBoolean, IsDateString, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';
import { IFeatureFlagTargetingRules } from '../interfaces';

export class UpdateFeatureFlagOverrideDto {
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(100)
  rolloutPercentage?: number;

  @IsObject()
  @IsOptional()
  rules?: IFeatureFlagTargetingRules;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
