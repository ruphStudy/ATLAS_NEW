import { IsObject, IsOptional, IsString } from 'class-validator';

export class InstallAppDto {
  @IsObject()
  @IsOptional()
  config?: Record<string, unknown>;

  /** Any app-specific credential material — encrypted at rest immediately, never echoed back in any response. */
  @IsString()
  @IsOptional()
  credentials?: string;
}

export class UpdateInstallationDto {
  @IsObject()
  @IsOptional()
  config?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  credentials?: string;
}

export class UpgradeAppDto {
  @IsString()
  @IsOptional()
  targetVersionId?: string;
}
