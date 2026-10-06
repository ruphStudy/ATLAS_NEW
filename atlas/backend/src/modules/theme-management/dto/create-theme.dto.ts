import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, ValidateNested, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { ThemeScope } from '../interfaces';
import { ThemeTokensDto } from './theme-tokens.dto';

export class CreateThemeDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'key must be a lowercase, hyphen-separated identifier (e.g. "acme-branded")',
  })
  key!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ThemeScope)
  @IsOptional()
  scope?: ThemeScope;

  /** Required when scope is ORGANIZATION. */
  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsBoolean()
  @IsOptional()
  isBranded?: boolean;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  faviconUrl?: string;

  @IsString()
  @IsOptional()
  accentColor?: string;

  @ValidateNested()
  @Type(() => ThemeTokensDto)
  tokens!: ThemeTokensDto;
}
