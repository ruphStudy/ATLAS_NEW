import { IsString, IsNotEmpty, IsOptional, IsEnum, IsObject, IsBoolean, IsIn, IsArray, Matches } from 'class-validator';
import { LocaleDirection, MeasurementSystem } from '../interfaces';

export class CreateLocaleDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z]{2}(-[A-Z]{2})?$/, { message: 'code must be a BCP-47-style locale (e.g. "en" or "en-US")' })
  code: string;

  @IsString()
  @IsNotEmpty()
  language: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  script?: string;

  @IsString()
  @IsNotEmpty()
  nativeName: string;

  @IsString()
  @IsNotEmpty()
  displayName: string;

  @IsEnum(LocaleDirection)
  @IsOptional()
  direction?: LocaleDirection;

  @IsString()
  @IsOptional()
  dateFormat?: string;

  @IsString()
  @IsOptional()
  timeFormat?: string;

  @IsObject()
  @IsOptional()
  numberFormat?: { decimalSeparator: string; thousandsSeparator: string; decimalDigits?: number };

  @IsString()
  @IsOptional()
  currencyCode?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsEnum(MeasurementSystem)
  @IsOptional()
  measurementSystem?: MeasurementSystem;

  @IsString()
  @IsOptional()
  fallbackLocaleCode?: string;
}

export class UpdateLocaleDto {
  @IsString()
  @IsOptional()
  nativeName?: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  script?: string;

  @IsEnum(LocaleDirection)
  @IsOptional()
  direction?: LocaleDirection;

  @IsString()
  @IsOptional()
  dateFormat?: string;

  @IsString()
  @IsOptional()
  timeFormat?: string;

  @IsObject()
  @IsOptional()
  numberFormat?: { decimalSeparator: string; thousandsSeparator: string; decimalDigits?: number };

  @IsString()
  @IsOptional()
  currencyCode?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsEnum(MeasurementSystem)
  @IsOptional()
  measurementSystem?: MeasurementSystem;

  @IsString()
  @IsOptional()
  fallbackLocaleCode?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  changeReason?: string;
}

export class SwitchLocaleDto {
  @IsString()
  @IsNotEmpty()
  localeCode: string;

  @IsIn(['USER', 'WORKSPACE', 'ORGANIZATION'])
  @IsOptional()
  scope?: 'USER' | 'WORKSPACE' | 'ORGANIZATION';
}

/** Optional reason for a lifecycle transition (enable/disable/archive/restore) — recorded in the locale's history. */
export class LocaleReasonDto {
  @IsString()
  @IsOptional()
  reason?: string;
}

export class SetEnabledLanguagesDto {
  @IsArray()
  @IsString({ each: true })
  localeCodes: string[];

  @IsIn(['WORKSPACE', 'ORGANIZATION'])
  @IsOptional()
  scope?: 'WORKSPACE' | 'ORGANIZATION';
}

export class SetPreferredLanguagesDto {
  @IsArray()
  @IsString({ each: true })
  localeCodes: string[];
}
