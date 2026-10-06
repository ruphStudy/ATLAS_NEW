import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { SettingScope } from '../interfaces';

export class CreateSettingValueDto {
  @IsString()
  @IsNotEmpty()
  definitionKey: string;

  @IsEnum(SettingScope)
  scope: SettingScope;

  /** Required when scope=MODULE. */
  @IsString()
  @IsOptional()
  moduleKey?: string;

  /** Required when scope=ORGANIZATION. */
  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsNotEmpty()
  value: unknown;

  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @IsDateString()
  @IsOptional()
  effectiveTo?: string;

  @IsString()
  @IsOptional()
  changeReason?: string;
}
