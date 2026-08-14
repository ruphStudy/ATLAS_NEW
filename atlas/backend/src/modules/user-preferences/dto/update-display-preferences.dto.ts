import { IsString, IsOptional, IsArray } from 'class-validator';

export class UpdateDisplayPreferencesDto {
  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  dateFormat?: string;

  @IsString()
  @IsOptional()
  numberFormat?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  measurementSystem?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  preferredLanguages?: string[];

  @IsString()
  @IsOptional()
  changeReason?: string;
}
