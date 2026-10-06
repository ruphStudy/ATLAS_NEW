import { IsIn, IsOptional, IsObject, IsString } from 'class-validator';

export class UpdateAppearancePreferencesDto {
  @IsIn(['LIGHT', 'DARK', 'SYSTEM'])
  @IsOptional()
  theme?: 'LIGHT' | 'DARK' | 'SYSTEM';

  @IsIn(['COMFORTABLE', 'COMPACT', 'SPACIOUS'])
  @IsOptional()
  density?: 'COMFORTABLE' | 'COMPACT' | 'SPACIOUS';

  @IsObject()
  @IsOptional()
  accessibility?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  navigation?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  changeReason?: string;
}
