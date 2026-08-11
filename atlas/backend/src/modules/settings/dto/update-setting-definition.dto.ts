import { IsString, IsOptional, IsArray, IsObject, IsEnum, ArrayMinSize } from 'class-validator';
import { SettingScope } from '../interfaces';

export class UpdateSettingDefinitionDto {
  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  defaultValue?: unknown;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  enumOptions?: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(SettingScope, { each: true })
  @IsOptional()
  allowedScopes?: SettingScope[];

  @IsObject()
  @IsOptional()
  validationRules?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  dependencies?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  visibilityCondition?: Record<string, unknown>;
}
