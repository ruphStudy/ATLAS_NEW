import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsObject,
  Matches,
  ArrayMinSize,
  ArrayNotEmpty,
} from 'class-validator';
import { SettingValueType, SettingScope } from '../interfaces';

export class CreateSettingDefinitionDto {
  /** Dotted, stable identifier e.g. "notifications.email.enabled". */
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(\.[a-z0-9-]+)*$/, {
    message: 'key must be a lowercase dot-separated identifier (e.g. "notifications.email.enabled")',
  })
  key!: string;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(SettingValueType)
  valueType!: SettingValueType;

  @IsOptional()
  defaultValue?: unknown;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  enumOptions?: string[];

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsEnum(SettingScope, { each: true })
  allowedScopes!: SettingScope[];

  @IsObject()
  @IsOptional()
  validationRules?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  dependencies?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  module?: string;

  @IsBoolean()
  @IsOptional()
  isSecretRef?: boolean;

  @IsObject()
  @IsOptional()
  visibilityCondition?: Record<string, unknown>;
}
