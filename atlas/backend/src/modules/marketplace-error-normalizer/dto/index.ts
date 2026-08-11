import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsObject,
  IsBoolean,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  UniversalErrorCode,
  ErrorCategory,
  ErrorSeverity,
  ErrorType,
} from '../interfaces';

export class NormalizeErrorRequestDto {
  @IsOptional()
  @IsString()
  providerCode?: string;

  @IsOptional()
  @IsString()
  providerMessage?: string;

  @IsOptional()
  @IsNumber()
  httpStatus?: number;

  @IsOptional()
  @IsString()
  requestId?: string;

  @IsOptional()
  @IsString()
  traceId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  module?: string;

  @IsOptional()
  @IsString()
  operation?: string;

  @IsOptional()
  @IsString()
  resourceId?: string;
}

export class SearchErrorsQueryDto {
  @IsString()
  workspaceId: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  module?: string;

  @IsOptional()
  @IsEnum(UniversalErrorCode)
  errorCode?: UniversalErrorCode;

  @IsOptional()
  @IsEnum(ErrorCategory)
  category?: ErrorCategory;

  @IsOptional()
  @IsEnum(ErrorSeverity)
  severity?: ErrorSeverity;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isResolved?: boolean;

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

export class GetTopErrorsQueryDto {
  @IsString()
  workspaceId: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class ResolveErrorRequestDto {
  @IsString()
  workspaceId: string;

  @IsString()
  historyId: string;
}

export class GetAggregatedErrorsQueryDto {
  @IsString()
  workspaceId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}

export class NormalizedErrorResponseDto {
  code: UniversalErrorCode;
  category: ErrorCategory;
  severity: ErrorSeverity;
  type: ErrorType;
  message: string;
  userMessage?: string;
  isRetryable: boolean;
  retryAfter?: number;
  providerError?: {
    providerCode?: string;
    providerMessage?: string;
    httpStatus?: number;
    requestId?: string;
    traceId?: string;
    timestamp?: Date;
    metadata?: Record<string, any>;
  };
  context?: {
    workspaceId?: string;
    provider?: string;
    accountId?: string;
    module?: string;
    operation?: string;
    resourceId?: string;
  };
  timestamp: Date;
}

export class ErrorClassificationResponseDto {
  isTransient: boolean;
  isPermanent: boolean;
  isDuplicate: boolean;
  isConflict: boolean;
  isPartialSuccess: boolean;
  recommendedAction: string;
}

export class SafeErrorResponseDto {
  code: string;
  message: string;
  category: string;
  severity: string;
  isRetryable: boolean;
  retryAfter?: number;
  requestId?: string;
  timestamp: Date;
}

export class InternalErrorResponseDto extends SafeErrorResponseDto {
  providerCode?: string;
  providerMessage?: string;
  httpStatus?: number;
  traceId?: string;
  context?: Record<string, any>;
}

export class UserFacingErrorResponseDto {
  message: string;
  code: string;
  canRetry: boolean;
  suggestedAction?: string;
}

export class ErrorHistoryResponseDto {
  id: string;
  workspaceId: string;
  provider: string;
  accountId?: string;
  module?: string;
  operation?: string;
  errorCode: UniversalErrorCode;
  errorCategory: ErrorCategory;
  errorSeverity: ErrorSeverity;
  errorMessage: string;
  providerCode?: string;
  providerMessage?: string;
  httpStatus?: number;
  requestId?: string;
  resourceId?: string;
  occurrenceCount: number;
  firstOccurredAt: Date;
  lastOccurredAt: Date;
  isResolved: boolean;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
}

export class ErrorOccurrenceResponseDto {
  historyId: string;
  workspaceId: string;
  errorCode: UniversalErrorCode;
  timestamp: Date;
  context?: Record<string, any>;
}

export class ErrorAggregationByCategoryResponseDto {
  category: ErrorCategory;
  count: number;
  occurrences: number;
}

export class ErrorAggregationBySeverityResponseDto {
  severity: ErrorSeverity;
  count: number;
  occurrences: number;
}

export class ItemErrorResponseDto {
  itemId: string;
  externalId?: string;
  error: NormalizedErrorResponseDto;
}

export class BulkErrorResponseDto {
  totalItems: number;
  successCount: number;
  failureCount: number;
  errors: ItemErrorResponseDto[];
  partialSuccess: boolean;
}
