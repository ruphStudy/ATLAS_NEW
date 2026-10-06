import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateDisplayPreferencesDto } from './update-display-preferences.dto';
import { UpdateNotificationPreferencesDto } from './update-notification-preferences.dto';
import { UpdateWorkspaceViewPreferencesDto } from './update-workspace-view-preferences.dto';
import { UpdateDefaultsPreferencesDto } from './update-defaults-preferences.dto';
import { UpdateAppearancePreferencesDto } from './update-appearance-preferences.dto';
import { UpdateAiPreferencesDto } from './update-ai-preferences.dto';

export class BulkUpdatePreferencesDto {
  @ValidateNested()
  @Type(() => UpdateDisplayPreferencesDto)
  @IsOptional()
  display?: UpdateDisplayPreferencesDto;

  @ValidateNested()
  @Type(() => UpdateNotificationPreferencesDto)
  @IsOptional()
  notifications?: UpdateNotificationPreferencesDto;

  @ValidateNested()
  @Type(() => UpdateWorkspaceViewPreferencesDto)
  @IsOptional()
  workspaceView?: UpdateWorkspaceViewPreferencesDto;

  @ValidateNested()
  @Type(() => UpdateDefaultsPreferencesDto)
  @IsOptional()
  defaults?: UpdateDefaultsPreferencesDto;

  @ValidateNested()
  @Type(() => UpdateAppearancePreferencesDto)
  @IsOptional()
  appearance?: UpdateAppearancePreferencesDto;

  @ValidateNested()
  @Type(() => UpdateAiPreferencesDto)
  @IsOptional()
  ai?: UpdateAiPreferencesDto;
}
