import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsObject,
  IsArray,
  ValidateNested,
  Min,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QueueType, JobState, JobPriority, BackoffStrategy } from '../interfaces';

export class JobBackoffDto {
  @IsEnum(BackoffStrategy)
  type!: BackoffStrategy;

  @IsNumber()
  @Min(0)
  delay!: number;
}

export class JobOptionsDto {
  @IsOptional()
  @IsEnum(JobPriority)
  priority?: JobPriority;

  @IsOptional()
  @IsNumber()
  @Min(0)
  delay?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  attempts?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => JobBackoffDto)
  backoff?: JobBackoffDto;

  @IsOptional()
  @IsBoolean()
  removeOnComplete?: boolean;

  @IsOptional()
  @IsBoolean()
  removeOnFail?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  timeout?: number;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  jobId?: string;
}

export class AddJobRequestDto {
  @IsString()
  workspaceId!: string;

  @IsString()
  provider!: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsEnum(QueueType)
  queueType!: QueueType;

  @IsString()
  type!: string;

  @IsObject()
  data!: Record<string, any>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @ValidateNested()
  @Type(() => JobOptionsDto)
  options?: JobOptionsDto;
}

export class BulkJobItemDto {
  @IsString()
  type!: string;

  @IsObject()
  data!: Record<string, any>;

  @IsOptional()
  @ValidateNested()
  @Type(() => JobOptionsDto)
  options?: JobOptionsDto;
}

export class AddBulkJobsRequestDto {
  @IsString()
  workspaceId!: string;

  @IsString()
  provider!: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsEnum(QueueType)
  queueType!: QueueType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkJobItemDto)
  jobs!: BulkJobItemDto[];
}

export class RetryJobRequestDto {
  @IsString()
  workspaceId!: string;

  @IsEnum(QueueType)
  queueType!: QueueType;

  @IsString()
  jobId!: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  resetAttempts?: boolean;

  @IsOptional()
  @IsEnum(JobPriority)
  priority?: JobPriority;
}

export class CancelJobRequestDto {
  @IsString()
  workspaceId!: string;

  @IsEnum(QueueType)
  queueType!: QueueType;

  @IsString()
  jobId!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  removeFromQueue?: boolean;
}

export class RecoverStaleJobsRequestDto {
  @IsEnum(QueueType)
  queueType!: QueueType;

  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsNumber()
  @Min(1)
  olderThanMinutes!: number;
}

export class ListJobsQueryDto {
  @IsString()
  workspaceId!: string;

  @IsEnum(QueueType)
  queueType!: QueueType;

  @IsEnum(JobState)
  state!: JobState;
}

export class GetJobQueryDto {
  @IsString()
  workspaceId!: string;

  @IsEnum(QueueType)
  queueType!: QueueType;

  @IsString()
  jobId!: string;
}

export class PauseQueueRequestDto {
  @IsEnum(QueueType)
  queueType!: QueueType;
}

export class ResumeQueueRequestDto {
  @IsEnum(QueueType)
  queueType!: QueueType;
}

export class DrainQueueRequestDto {
  @IsEnum(QueueType)
  queueType!: QueueType;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  delayed?: boolean;
}

export class CleanQueueRequestDto {
  @IsEnum(QueueType)
  queueType!: QueueType;

  @IsNumber()
  @Min(0)
  grace!: number;

  @IsNumber()
  @Min(1)
  limit!: number;

  @IsEnum(['completed', 'failed'])
  type!: 'completed' | 'failed';
}

export class GetErrorSummaryQueryDto {
  @IsString()
  workspaceId!: string;

  @IsEnum(QueueType)
  queueType!: QueueType;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}

export class RateLimitConfigDto {
  @IsString()
  workspaceId!: string;

  @IsString()
  provider!: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsEnum(QueueType)
  queueType!: QueueType;

  @IsNumber()
  @Min(1)
  maxConcurrent!: number;

  @IsNumber()
  @Min(1)
  maxPerMinute!: number;

  @IsNumber()
  @Min(1)
  maxPerHour!: number;

  @Type(() => Boolean)
  @IsBoolean()
  isEnabled!: boolean;
}

export class ReprocessDeadLetterJobRequestDto {
  @IsString()
  workspaceId!: string;

  @IsString()
  deadLetterJobId!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => JobOptionsDto)
  options?: JobOptionsDto;
}

export class JobInfoResponseDto {
  id!: string;
  queueName!: string;
  queueType!: QueueType;
  workspaceId!: string;
  provider!: string;
  accountId?: string;
  state!: JobState;
  priority!: number;
  attempts!: number;
  maxAttempts!: number;
  progress?: number;
  data: any;
  failedReason?: string;
  stacktrace?: string[];
  addedAt!: Date;
  processedAt?: Date;
  finishedAt?: Date;
  delay?: number;
  timestamp!: Date;
}

export class QueueMetricsResponseDto {
  queueName!: string;
  queueType!: QueueType;
  status!: string;
  waiting!: number;
  active!: number;
  delayed!: number;
  completed!: number;
  failed!: number;
  paused!: number;
  isPaused!: boolean;
  concurrency?: number;
  throughput?: number;
  avgProcessingTime?: number;
  avgWaitTime?: number;
  errorRate?: number;
  lastJobAt?: Date;
  healthScore!: number;
}

export class QueueHealthResponseDto {
  queueName!: string;
  isHealthy!: boolean;
  status!: string;
  issues!: string[];
  metrics!: QueueMetricsResponseDto;
  checkedAt!: Date;
}

export class QueueOperationResponseDto {
  success!: boolean;
  message!: string;
  queueName?: string;
  jobId?: string;
  jobIds?: string[];
  metadata?: Record<string, any>;
}

export class AggregatedMetricsResponseDto {
  queueType!: QueueType;
  totalJobs!: number;
  waitingJobs!: number;
  activeJobs!: number;
  delayedJobs!: number;
  completedJobs!: number;
  failedJobs!: number;
  cancelledJobs!: number;
  avgProcessingTime?: number;
  avgWaitTime?: number;
  throughput?: number;
  errorRate!: number;
  healthScore!: number;
}

export class ErrorSummaryResponseDto {
  errorType!: string;
  errorMessage!: string;
  count!: number;
  firstOccurrence!: Date;
  lastOccurrence!: Date;
  affectedJobs!: string[];
  isRecoverable!: boolean;
}

export class JobHistoryResponseDto {
  jobId!: string;
  queueName!: string;
  queueType!: QueueType;
  workspaceId!: string;
  state!: JobState;
  event!: string;
  message?: string;
  metadata?: Record<string, any>;
  timestamp!: Date;
}
