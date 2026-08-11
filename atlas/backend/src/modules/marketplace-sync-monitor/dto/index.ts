import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SyncModule, SyncStatus, SyncIssueType } from '../interfaces';

export class GetSyncSnapshotQueryDto {
  @IsString()
  workspaceId: string;

  @IsEnum(SyncModule)
  module: SyncModule;

  @IsString()
  provider: string;

  @IsOptional()
  @IsString()
  accountId?: string;
}

export class ListSyncsQueryDto {
  @IsString()
  workspaceId: string;

  @IsOptional()
  @IsEnum(SyncModule)
  module?: SyncModule;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsEnum(SyncStatus)
  status?: SyncStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;
}

export class GetSyncHistoryQueryDto {
  @IsString()
  workspaceId: string;

  @IsEnum(SyncModule)
  module: SyncModule;

  @IsString()
  provider: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class GetItemFailuresQueryDto {
  @IsString()
  workspaceId: string;

  @IsOptional()
  @IsString()
  jobId?: string;

  @IsOptional()
  @IsEnum(SyncModule)
  module?: SyncModule;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unresolvedOnly?: boolean;
}

export class GetIssuesQueryDto {
  @IsString()
  workspaceId: string;

  @IsOptional()
  @IsEnum(SyncModule)
  module?: SyncModule;

  @IsOptional()
  @IsEnum(SyncIssueType)
  type?: SyncIssueType;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  activeOnly?: boolean;
}

export class RetrySyncRequestDto {
  @IsString()
  workspaceId: string;

  @IsEnum(SyncModule)
  module: SyncModule;

  @IsString()
  provider: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  jobId?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  resumeFromCursor?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  resetErrors?: boolean;
}

export class CancelSyncRequestDto {
  @IsString()
  workspaceId: string;

  @IsEnum(SyncModule)
  module: SyncModule;

  @IsString()
  provider: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsString()
  jobId: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  graceful?: boolean;
}

export class SyncSnapshotResponseDto {
  workspaceId: string;
  module: SyncModule;
  provider: string;
  accountId?: string;
  status: SyncStatus;
  jobId?: string;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  itemsProcessed: number;
  itemsTotal?: number;
  itemsFailed: number;
  successRate: number;
  throughput?: number;
  currentPage?: number;
  nextCursor?: string;
  errorCount: number;
  lastError?: string;
  lastErrorAt?: Date;
  consecutiveFailures: number;
  lastSuccessfulSyncAt?: Date;
  nextScheduledSyncAt?: Date;
}

export class SyncAggregateResponseDto {
  snapshot: SyncSnapshotResponseDto;
  queueHealth?: any;
  rateLimitStatus?: any;
  recentHistory: any[];
  activeIssues: any[];
}

export class SyncHistoryResponseDto {
  workspaceId: string;
  module: SyncModule;
  provider: string;
  accountId?: string;
  jobId: string;
  status: SyncStatus;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  itemsProcessed: number;
  itemsTotal?: number;
  itemsFailed: number;
  successRate: number;
  errorSummary?: string;
  triggeredBy?: string;
}

export class ItemFailureResponseDto {
  workspaceId: string;
  module: SyncModule;
  provider: string;
  accountId?: string;
  jobId: string;
  itemId: string;
  externalId?: string;
  errorCode?: string;
  errorMessage: string;
  failedAt: Date;
  retryCount: number;
  isResolved: boolean;
}

export class IssueResponseDto {
  workspaceId: string;
  module: SyncModule;
  provider: string;
  accountId?: string;
  type: SyncIssueType;
  severity: string;
  message: string;
  detectedAt: Date;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
}

export class SyncMetricsResponseDto {
  workspaceId: string;
  module?: SyncModule;
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  totalItemsProcessed: number;
  totalItemsFailed: number;
  overallSuccessRate: number;
  avgDuration?: number;
  avgThroughput?: number;
  activeIssuesCount: number;
  unresolvedFailuresCount: number;
  stuckJobsCount: number;
  delayedJobsCount: number;
  consecutiveFailuresCount: number;
}

export class ErrorSummaryResponseDto {
  errorCode?: string;
  errorMessage: string;
  count: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  affectedItems: string[];
  isRecoverable: boolean;
  suggestedAction?: string;
}

export class SyncActionResponseDto {
  success: boolean;
  message: string;
  jobId?: string;
  metadata?: Record<string, any>;
}
