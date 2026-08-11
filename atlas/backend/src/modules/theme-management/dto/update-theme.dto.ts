import { IsString, IsOptional, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ThemeTokensDto } from './theme-tokens.dto';

export class UpdateThemeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

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
  @IsOptional()
  tokens?: ThemeTokensDto;

  @IsString()
  @IsOptional()
  changeReason?: string;
}
