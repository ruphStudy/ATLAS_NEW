import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateLicenseDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  featureFlagKeys?: string[];

  @IsInt()
  @IsOptional()
  @Min(1)
  maxActivations?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  gracePeriodDays?: number;

  @IsString()
  @IsOptional()
  externalReference?: string;
}
