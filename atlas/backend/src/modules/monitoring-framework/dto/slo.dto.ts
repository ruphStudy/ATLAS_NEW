import { IsEnum, IsInt, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { MonitoringDimension, MonitoringSloStatus } from '../interfaces';

export class CreateMonitoringSloDto {
  @IsString()
  service!: string;

  @IsEnum(MonitoringDimension)
  dimension!: MonitoringDimension;

  @IsNumber()
  targetValue!: number;

  @IsNumber()
  warningThreshold!: number;

  @IsNumber()
  criticalThreshold!: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  windowMinutes?: number;

  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateMonitoringSloDto {
  @IsNumber()
  @IsOptional()
  targetValue?: number;

  @IsNumber()
  @IsOptional()
  warningThreshold?: number;

  @IsNumber()
  @IsOptional()
  criticalThreshold?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  windowMinutes?: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  changeReason?: string;
}

export class MonitoringSloFilterDto extends PaginationDto {
  @IsString()
  @IsOptional()
  service?: string;

  @IsEnum(MonitoringSloStatus)
  @IsOptional()
  status?: MonitoringSloStatus;
}
