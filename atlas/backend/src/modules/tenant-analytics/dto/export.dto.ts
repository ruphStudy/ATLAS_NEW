import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EXPORT_FORMATS } from '../constants';

export class ExportAnalyticsQueryDto {
  /** Which report to export — matches one of this module's own report method names (e.g. 'growth', 'revenue', 'churn', 'payment-health', 'segments'). */
  @IsString()
  @IsNotEmpty()
  report!: string;

  @IsIn(EXPORT_FORMATS)
  @IsOptional()
  format?: (typeof EXPORT_FORMATS)[number];

  @IsString()
  @IsOptional()
  start?: string;

  @IsString()
  @IsOptional()
  end?: string;
}
