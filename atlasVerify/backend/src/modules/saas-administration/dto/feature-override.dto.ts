import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Thin pass-through to `FeatureFlagsService.createOverride()` at WORKSPACE scope for this tenant — this module never defines flag types, dependencies or targeting rules itself. */
export class FeatureOverrideDto {
  @IsString()
  @IsNotEmpty()
  flagKey: string;

  @IsBoolean()
  enabled: boolean;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
