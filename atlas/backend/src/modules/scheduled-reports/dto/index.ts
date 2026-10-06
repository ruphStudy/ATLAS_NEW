import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsNumber,
  IsDate,
  IsObject,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ScheduleType,
  ScheduleStatus,
  ScheduleFrequency,
  DeliveryMethod,
  OutputFormat,
  ExecutionStatus,
  IScheduleRecipient,
  IScheduleConfig,
  IDeliveryConfig,
  IReportSchedule,
  IScheduleExecution,
} from '../interfaces';

export class ScheduleRecipientDto implements IScheduleRecipient {
  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsObject()
  @IsOptional()
  notificationPreferences?: {
    onSuccess: boolean;
    onFailure: boolean;
  };
}

export class ScheduleConfigDto implements IScheduleConfig {
  @IsEnum(ScheduleType)
  @IsNotEmpty()
  type!: ScheduleType;

  @IsEnum(ScheduleFrequency)
  @IsOptional()
  frequency?: ScheduleFrequency;

  @IsString()
  @IsOptional()
  cronExpression?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  interval?: number;

  @IsString()
  @IsNotEmpty()
  timezone!: string;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  startDate!: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  executeAt?: Date;

  @IsNumber()
  @IsOptional()
  @Min(1)
  maxExecutions?: number;
}

export class DeliveryConfigDto implements IDeliveryConfig {
  @IsArray()
  @IsEnum(DeliveryMethod, { each: true })
  @IsNotEmpty()
  methods!: DeliveryMethod[];

  @IsArray()
  @IsEnum(OutputFormat, { each: true })
  @IsNotEmpty()
  outputFormats!: OutputFormat[];

  @IsString()
  @IsOptional()
  emailSubject?: string;

  @IsString()
  @IsOptional()
  emailBody?: string;

  @IsString()
  @IsOptional()
  fileStoragePath?: string;

  @IsString()
  @IsOptional()
  notificationTitle?: string;

  @IsString()
  @IsOptional()
  notificationMessage?: string;
}

export class CreateReportScheduleDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  scheduleKey!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  reportDefinitionId!: string;

  @ValidateNested()
  @Type(() => ScheduleConfigDto)
  @IsNotEmpty()
  scheduleConfig!: ScheduleConfigDto;

  @IsArray()
  @IsOptional()
  reportFilters?: any[];

  @IsObject()
  @IsOptional()
  reportDateRange?: {
    start: Date;
    end: Date;
    presetKey?: string;
  };

  @IsObject()
  @IsOptional()
  reportParameters?: Record<string, any>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleRecipientDto)
  @IsNotEmpty()
  recipients!: ScheduleRecipientDto[];

  @ValidateNested()
  @Type(() => DeliveryConfigDto)
  @IsNotEmpty()
  deliveryConfig!: DeliveryConfigDto;

  @IsString()
  @IsOptional()
  locale?: string;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(10)
  maxRetries?: number;

  @IsObject()
  @IsOptional()
  retryBackoff?: {
    type: 'fixed' | 'exponential';
    initialDelayMs: number;
    maxDelayMs: number;
    multiplier?: number;
  };

  @IsBoolean()
  @IsOptional()
  allowConcurrentExecution?: boolean;

  @IsBoolean()
  @IsOptional()
  idempotencyEnabled?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  @IsOptional()
  createdBy?: string;
}

export class UpdateReportScheduleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @ValidateNested()
  @Type(() => ScheduleConfigDto)
  @IsOptional()
  scheduleConfig?: ScheduleConfigDto;

  @IsArray()
  @IsOptional()
  reportFilters?: any[];

  @IsObject()
  @IsOptional()
  reportDateRange?: {
    start: Date;
    end: Date;
    presetKey?: string;
  };

  @IsObject()
  @IsOptional()
  reportParameters?: Record<string, any>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleRecipientDto)
  @IsOptional()
  recipients?: ScheduleRecipientDto[];

  @ValidateNested()
  @Type(() => DeliveryConfigDto)
  @IsOptional()
  deliveryConfig?: DeliveryConfigDto;

  @IsString()
  @IsOptional()
  locale?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(10)
  maxRetries?: number;

  @IsObject()
  @IsOptional()
  retryBackoff?: {
    type: 'fixed' | 'exponential';
    initialDelayMs: number;
    maxDelayMs: number;
    multiplier?: number;
  };

  @IsBoolean()
  @IsOptional()
  allowConcurrentExecution?: boolean;

  @IsBoolean()
  @IsOptional()
  idempotencyEnabled?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  @IsOptional()
  updatedBy?: string;
}

export class ExecuteScheduleDto {
  @IsString()
  @IsNotEmpty()
  scheduleId!: string;

  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsBoolean()
  @IsOptional()
  isManual?: boolean;

  @IsString()
  @IsOptional()
  executedBy?: string;
}

export class ScheduleFilterDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsOptional()
  reportDefinitionId?: string;

  @IsEnum(ScheduleStatus)
  @IsOptional()
  status?: ScheduleStatus;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsBoolean()
  @IsOptional()
  paused?: boolean;

  @IsString()
  @IsOptional()
  search?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ExecutionFilterDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsOptional()
  scheduleId?: string;

  @IsString()
  @IsOptional()
  reportDefinitionId?: string;

  @IsEnum(ExecutionStatus)
  @IsOptional()
  status?: ExecutionStatus;

  @IsBoolean()
  @IsOptional()
  isManual?: boolean;

  @IsBoolean()
  @IsOptional()
  isMissedRunRecovery?: boolean;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ReportScheduleResponseDto implements IReportSchedule {
  id!: string;
  workspaceId!: string;
  scheduleKey!: string;
  name!: string;
  description?: string;
  reportDefinitionId!: string;
  status!: ScheduleStatus;
  scheduleConfig!: IScheduleConfig;
  reportFilters?: any[];
  reportDateRange?: {
    start: Date;
    end: Date;
    presetKey?: string;
  };
  reportParameters?: Record<string, any>;
  recipients!: IScheduleRecipient[];
  deliveryConfig!: IDeliveryConfig;
  locale?: string;
  enabled!: boolean;
  paused!: boolean;
  nextRunAt?: Date;
  lastRunAt?: Date;
  lastRunStatus?: ExecutionStatus;
  executionCount!: number;
  successCount!: number;
  failureCount!: number;
  maxRetries!: number;
  retryBackoff!: {
    type: 'fixed' | 'exponential';
    initialDelayMs: number;
    maxDelayMs: number;
    multiplier?: number;
  };
  allowConcurrentExecution!: boolean;
  idempotencyEnabled!: boolean;
  metadata?: Record<string, any>;
  createdBy?: string;
  updatedBy?: string;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date;
}

export class ScheduleExecutionResponseDto implements IScheduleExecution {
  id!: string;
  scheduleId!: string;
  workspaceId!: string;
  reportDefinitionId!: string;
  scheduleKey!: string;
  status!: ExecutionStatus;
  scheduledAt!: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  attemptNumber!: number;
  isManual!: boolean;
  isMissedRunRecovery!: boolean;
  generationStartedAt?: Date;
  generationCompletedAt?: Date;
  generationDuration?: number;
  reportExecutionId?: string;
  deliveryStartedAt?: Date;
  deliveryCompletedAt?: Date;
  deliveryDuration?: number;
  outputReferences?: Array<{
    method: DeliveryMethod;
    format: OutputFormat;
    reference: string;
    size?: number;
    deliveredAt?: Date;
  }>;
  errorCode?: string;
  errorMessage?: string;
  errorStack?: string;
  retriedAt?: Date;
  metadata?: Record<string, any>;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaginatedScheduleResponseDto {
  data!: ReportScheduleResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class PaginatedExecutionResponseDto {
  data!: ScheduleExecutionResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}
