import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { MeasurementSystem } from '../interfaces';

export class SetProviderRequirementDto {
  /** Omit for a global default requirement applying across every workspace. */
  @IsString()
  @IsOptional()
  workspaceId?: string;

  @IsString()
  @IsNotEmpty()
  marketplaceKey!: string;

  @IsString()
  @IsOptional()
  countryCode?: string;

  @IsString()
  @IsNotEmpty()
  requiredLocaleCode!: string;

  @IsString()
  @IsOptional()
  requiredCurrencyCode?: string;

  @IsString()
  @IsOptional()
  requiredTimezone?: string;

  @IsEnum(MeasurementSystem)
  @IsOptional()
  requiredMeasurementSystem?: MeasurementSystem;
}
