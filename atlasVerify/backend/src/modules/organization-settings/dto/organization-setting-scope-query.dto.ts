import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SettingScope } from '@modules/settings/interfaces';

export class OrganizationSettingScopeQueryDto {
  @IsEnum(SettingScope)
  @IsOptional()
  scope?: SettingScope;

  @IsString()
  @IsOptional()
  organizationId?: string;
}
