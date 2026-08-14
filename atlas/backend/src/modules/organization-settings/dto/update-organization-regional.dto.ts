import { IsString, IsOptional, IsArray } from 'class-validator';

export class UpdateOrganizationRegionalDto {
  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  locale?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  dateFormat?: string;

  @IsString()
  @IsOptional()
  numberFormat?: string;

  @IsString()
  @IsOptional()
  measurementSystem?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  enabledLanguages?: string[];

  @IsString()
  @IsOptional()
  changeReason?: string;
}
