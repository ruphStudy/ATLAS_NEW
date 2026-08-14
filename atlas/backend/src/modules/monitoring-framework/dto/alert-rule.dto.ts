import { IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { MonitoringAlertRuleStatus, MonitoringAlertSeverity } from '../interfaces';

export class CreateMonitoringAlertRuleDto {
  @IsString()
  sourceKey: string;

  @IsString()
  @IsOptional()
  sloId?: string;

  @IsString()
  @IsOptional()
  service?: string;

  @IsString()
  @IsOptional()
  dimension?: string;

  @IsString()
  @IsNotEmpty()
  conditionField: string;

  @IsString()
  @IsNotEmpty()
  conditionOperator: string;

  @IsNotEmpty()
  conditionValue: unknown;

  @IsEnum(MonitoringAlertSeverity)
  severity: MonitoringAlertSeverity;

  @IsInt()
  @Min(0)
  @IsOptional()
  cooldownMinutes?: number;

  @IsString()
  @IsOptional()
  notifyTargetType?: string;

  @IsString()
  @IsOptional()
  notifyTargetRef?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class MonitoringAlertRuleFilterDto extends PaginationDto {
  @IsString()
  @IsOptional()
  sourceKey?: string;

  @IsEnum(MonitoringAlertRuleStatus)
  @IsOptional()
  status?: MonitoringAlertRuleStatus;
}
