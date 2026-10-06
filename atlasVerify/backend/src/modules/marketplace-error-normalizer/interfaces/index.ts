export enum ErrorCategory {
  PROVIDER = 'PROVIDER',
  API = 'API',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  QUEUE = 'QUEUE',
  BUSINESS = 'BUSINESS',
  SYSTEM = 'SYSTEM',
  UNKNOWN = 'UNKNOWN',
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ErrorType {
  TRANSIENT = 'TRANSIENT',
  PERMANENT = 'PERMANENT',
  DUPLICATE = 'DUPLICATE',
  CONFLICT = 'CONFLICT',
  PARTIAL_SUCCESS = 'PARTIAL_SUCCESS',
}

export enum UniversalErrorCode {
  // Provider errors
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  PROVIDER_CONFIGURATION_ERROR = 'PROVIDER_CONFIGURATION_ERROR',
  
  // Authentication errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  AUTHORIZATION_FAILED = 'AUTHORIZATION_FAILED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FIELD_VALUE = 'INVALID_FIELD_VALUE',
  INVALID_FORMAT = 'INVALID_FORMAT',
  
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  DNS_ERROR = 'DNS_ERROR',
  
  // Timeout errors
  TIMEOUT = 'TIMEOUT',
  REQUEST_TIMEOUT = 'REQUEST_TIMEOUT',
  OPERATION_TIMEOUT = 'OPERATION_TIMEOUT',
  
  // Rate limit errors
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  THROTTLED = 'THROTTLED',
  
  // Queue errors
  QUEUE_FULL = 'QUEUE_FULL',
  QUEUE_ERROR = 'QUEUE_ERROR',
  JOB_FAILED = 'JOB_FAILED',
  JOB_TIMEOUT = 'JOB_TIMEOUT',
  
  // Business errors
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  DUPLICATE_REQUEST = 'DUPLICATE_REQUEST',
  OPERATION_NOT_SUPPORTED = 'OPERATION_NOT_SUPPORTED',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  
  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  
  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface IProviderError {
  providerCode?: string;
  providerMessage?: string;
  httpStatus?: number;
  requestId?: string;
  traceId?: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface INormalizedError {
  code: UniversalErrorCode;
  category: ErrorCategory;
  severity: ErrorSeverity;
  type: ErrorType;
  message: string;
  userMessage?: string;
  isRetryable: boolean;
  retryAfter?: number;
  providerError?: IProviderError;
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

export interface IItemError {
  itemId: string;
  externalId?: string;
  error: INormalizedError;
}

export interface IBulkErrorResponse {
  totalItems: number;
  successCount: number;
  failureCount: number;
  errors: IItemError[];
  partialSuccess: boolean;
}

export interface IErrorClassification {
  isTransient: boolean;
  isPermanent: boolean;
  isDuplicate: boolean;
  isConflict: boolean;
  isPartialSuccess: boolean;
  recommendedAction: string;
}

export interface IErrorMapping {
  providerPattern: string | RegExp;
  universalCode: UniversalErrorCode;
  category: ErrorCategory;
  severity: ErrorSeverity;
  isRetryable: boolean;
  userMessage?: string;
}

export interface IErrorEvent {
  eventType: 'error.normalized' | 'error.recorded' | 'error.threshold_exceeded';
  workspaceId: string;
  provider: string;
  accountId?: string;
  module?: string;
  error: INormalizedError;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface IErrorHistory {
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

export interface IErrorOccurrence {
  historyId: string;
  workspaceId: string;
  errorCode: UniversalErrorCode;
  timestamp: Date;
  context?: Record<string, any>;
}

export interface ErrorSearchCriteria {
  workspaceId: string;
  provider?: string;
  accountId?: string;
  module?: string;
  errorCode?: UniversalErrorCode;
  category?: ErrorCategory;
  severity?: ErrorSeverity;
  startDate?: Date;
  endDate?: Date;
  isResolved?: boolean;
  limit?: number;
  offset?: number;
}

export interface SafeErrorResponse {
  code: string;
  message: string;
  category: string;
  severity: string;
  isRetryable: boolean;
  retryAfter?: number;
  requestId?: string;
  timestamp: Date;
}

export interface InternalErrorResponse extends SafeErrorResponse {
  providerCode?: string;
  providerMessage?: string;
  httpStatus?: number;
  traceId?: string;
  context?: Record<string, any>;
}

export interface UserFacingErrorResponse {
  message: string;
  code: string;
  canRetry: boolean;
  suggestedAction?: string;
}
