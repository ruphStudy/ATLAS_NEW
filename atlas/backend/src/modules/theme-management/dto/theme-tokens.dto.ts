import { IsObject, IsOptional, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ThemeModeTokensDto {
  @IsObject()
  @IsNotEmpty()
  colors!: Record<string, string>;

  @IsObject()
  @IsOptional()
  typography?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  spacing?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  radius?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  shadows?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  components?: Record<string, unknown>;
}

export class ThemeTokensDto {
  @ValidateNested()
  @Type(() => ThemeModeTokensDto)
  light!: ThemeModeTokensDto;

  @ValidateNested()
  @Type(() => ThemeModeTokensDto)
  dark!: ThemeModeTokensDto;
}
