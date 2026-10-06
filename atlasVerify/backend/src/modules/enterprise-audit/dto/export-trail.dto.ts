import { IsIn, IsOptional } from 'class-validator';
import { EnterpriseAuditTrailFilterDto } from './trail-filter.dto';

export class ExportEnterpriseAuditTrailDto extends EnterpriseAuditTrailFilterDto {
  @IsIn(['CSV', 'JSON'])
  @IsOptional()
  format?: 'CSV' | 'JSON';
}
