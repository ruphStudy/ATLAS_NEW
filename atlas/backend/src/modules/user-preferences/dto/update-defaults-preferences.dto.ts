import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateDefaultsPreferencesDto {
  @IsString()
  @IsOptional()
  marketplace?: string;

  @IsString()
  @IsOptional()
  warehouseId?: string;

  @IsIn(['PDF', 'CSV', 'XLSX'])
  @IsOptional()
  reportFormat?: 'PDF' | 'CSV' | 'XLSX';

  @IsString()
  @IsOptional()
  analyticsDateRange?: string;

  @IsString()
  @IsOptional()
  changeReason?: string;
}
