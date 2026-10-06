import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

/** Sets whether a locale is activated for a given (optional) country/marketplace within a workspace, or globally when `workspaceId` is omitted. */
export class SetLocaleAvailabilityDto {
  @IsString()
  @IsNotEmpty()
  localeCode: string;

  /** Omit for a global default that applies across every workspace. */
  @IsString()
  @IsOptional()
  workspaceId?: string;

  @IsString()
  @IsOptional()
  countryCode?: string;

  @IsString()
  @IsOptional()
  marketplaceKey?: string;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  isPreferred?: boolean;
}
