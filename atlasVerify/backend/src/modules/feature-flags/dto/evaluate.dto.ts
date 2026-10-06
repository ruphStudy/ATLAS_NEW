import { ArrayMinSize, IsArray, IsOptional, IsString } from 'class-validator';

export class EvaluateFeatureFlagContextDto {
  @IsString()
  @IsOptional()
  environment?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsString()
  @IsOptional()
  marketplace?: string;

  @IsString()
  @IsOptional()
  provider?: string;
}

export class EvaluateManyFeatureFlagsDto extends EvaluateFeatureFlagContextDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  keys: string[];
}
