import { IsIn, IsOptional } from 'class-validator';
import { SaasAuditTrailFilterDto } from './audit-trail-filter.dto';

export class ExportAuditTrailDto extends SaasAuditTrailFilterDto {
  @IsIn(['CSV', 'JSON'])
  @IsOptional()
  format?: 'CSV' | 'JSON';
}
