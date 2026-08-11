import { IsString, IsOptional, IsObject, IsArray } from 'class-validator';

export class UpdateWorkspaceViewPreferencesDto {
  @IsString()
  @IsOptional()
  defaultWorkspaceId?: string;

  @IsObject()
  @IsOptional()
  dashboardLayout?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  tablePreferences?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  filterPresets?: Record<string, unknown>;

  @IsArray()
  @IsOptional()
  savedViews?: Record<string, unknown>[];

  @IsString()
  @IsOptional()
  changeReason?: string;
}
