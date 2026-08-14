import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { MonitoringAlertSeverity, MonitoringIncidentStatus } from '../interfaces';

export class ResolveMonitoringIncidentDto {
  @IsString()
  @IsOptional()
  resolution?: string;
}

export class MonitoringIncidentFilterDto extends PaginationDto {
  @IsEnum(MonitoringIncidentStatus)
  @IsOptional()
  status?: MonitoringIncidentStatus;

  @IsEnum(MonitoringAlertSeverity)
  @IsOptional()
  severity?: MonitoringAlertSeverity;
}
