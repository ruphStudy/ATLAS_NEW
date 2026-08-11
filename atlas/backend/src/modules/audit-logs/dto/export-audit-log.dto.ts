import { IsIn, IsOptional } from 'class-validator';
import { AuditLogFilterDto } from './audit-log-filter.dto';

export class ExportAuditLogDto extends AuditLogFilterDto {
  @IsIn(['CSV', 'JSON'])
  @IsOptional()
  format?: 'CSV' | 'JSON';
}
