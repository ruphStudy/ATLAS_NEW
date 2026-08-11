import { IsString, IsNotEmpty, IsOptional, IsEnum, IsObject, IsBoolean, Matches } from 'class-validator';
import { LocaleDirection } from '../interfaces';

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
}

export class UpdateLocaleDto {
  @IsString()
  @IsOptional()
  nativeName?: string;

  @IsString()
  @IsOptional()
  displayName?: string;

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

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
