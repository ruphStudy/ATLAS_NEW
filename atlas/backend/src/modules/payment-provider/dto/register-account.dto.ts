import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class RegisterPaymentProviderAccountDto {
  @IsString()
  @IsNotEmpty()
  providerKey!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'accountHandle must be a lowercase, hyphen-separated identifier (e.g. "primary")' })
  accountHandle!: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsInt()
  @IsOptional()
  priority?: number;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  supportedCountries?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  supportedCurrencies?: string[];
}
