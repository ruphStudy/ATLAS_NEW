import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ThemeScope } from '../interfaces';

export class SetActiveThemeDto {
  @IsString()
  @IsNotEmpty()
  themeKey: string;

  /** WORKSPACE (default) or ORGANIZATION — which Settings Framework precedence tier this activation applies at. */
  @IsEnum(ThemeScope)
  @IsOptional()
  scope?: ThemeScope;

  @IsString()
  @IsOptional()
  organizationId?: string;
}
