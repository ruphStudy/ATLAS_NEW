import { IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdateSettingValueDto {
  @IsNotEmpty()
  @IsOptional()
  value?: unknown;

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
