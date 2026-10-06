import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, IsDateString } from 'class-validator';

export class FormatDateDto {
  @IsDateString()
  @IsNotEmpty()
  date!: string;

  @IsString()
  @IsOptional()
  localeCode?: string;
}

export class FormatNumberDto {
  @IsNumber()
  value!: number;

  @IsString()
  @IsOptional()
  localeCode?: string;
}

export class FormatCurrencyDto {
  @IsNumber()
  value!: number;

  @IsString()
  @IsOptional()
  localeCode?: string;

  @IsString()
  @IsOptional()
  currencyCode?: string;
}

export class ParseNumberDto {
  @IsString()
  @IsNotEmpty()
  value!: string;

  @IsString()
  @IsOptional()
  localeCode?: string;
}

export class SortLocaleAwareDto {
  @IsArray()
  @IsString({ each: true })
  items!: string[];

  @IsString()
  @IsOptional()
  localeCode?: string;
}
