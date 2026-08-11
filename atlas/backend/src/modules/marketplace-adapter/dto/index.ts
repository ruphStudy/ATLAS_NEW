import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsObject,
  IsArray,
  ValidateNested,
  IsDate,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AdapterCapability,
  AdapterOperation,
  AdapterStatus,
  ApiVersion,
  HttpMethod,
} from '../interfaces';

export class AdapterConfigDto {
  @IsString()
  workspaceId: string;

  @IsString()
  provider: string;

  @IsString()
  accountId: string;

  @IsEnum(ApiVersion)
  @IsOptional()
  apiVersion?: ApiVersion;

  @IsString()
  @IsOptional()
  baseUrl?: string;

  @IsNumber()
  @IsOptional()
  timeout?: number;

  @IsNumber()
  @IsOptional()
  maxRetries?: number;

  @IsNumber()
  @IsOptional()
  retryDelay?: number;

  @IsObject()
  @IsOptional()
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };

  @IsBoolean()
  @IsOptional()
  enableTracing?: boolean;

  @IsObject()
  @IsOptional()
  customSettings?: Record<string, any>;
}

export class AdapterCredentialsDto {
  @IsString()
  workspaceId: string;

  @IsString()
  provider: string;

  @IsString()
  accountId: string;

  @IsString()
  credentialType: string;

  @IsObject()
  credentials: Record<string, any>;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  expiresAt?: Date;
}

export class RequestContextDto {
  @IsString()
  workspaceId: string;

  @IsString()
  provider: string;

  @IsString()
  accountId: string;

  @IsEnum(AdapterOperation)
  operation: AdapterOperation;

  @IsString()
  requestId: string;

  @IsString()
  @IsOptional()
  correlationId?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class PaginationParamsDto {
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @IsNumber()
  @Min(1)
  @Max(1000)
  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  cursor?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  offset?: number;
}

export class InitializeAdapterRequestDto {
  @ValidateNested()
  @Type(() => AdapterConfigDto)
  config: AdapterConfigDto;

  @ValidateNested()
  @Type(() => AdapterCredentialsDto)
  credentials: AdapterCredentialsDto;
}

export class ExecuteOperationRequestDto {
  @IsString()
  workspaceId: string;

  @IsString()
  provider: string;

  @IsString()
  accountId: string;

  @IsEnum(AdapterOperation)
  operation: AdapterOperation;

  @IsObject()
  @IsOptional()
  parameters?: Record<string, any>;

  @IsObject()
  @IsOptional()
  data?: any;

  @ValidateNested()
  @Type(() => PaginationParamsDto)
  @IsOptional()
  pagination?: PaginationParamsDto;
}

export class GetCapabilitiesQueryDto {
  @IsString()
  workspaceId: string;

  @IsString()
  provider: string;

  @IsString()
  accountId: string;
}

export class HealthCheckQueryDto {
  @IsString()
  workspaceId: string;

  @IsString()
  provider: string;

  @IsString()
  accountId: string;
}

export class ConnectionTestQueryDto {
  @IsString()
  workspaceId: string;

  @IsString()
  provider: string;

  @IsString()
  accountId: string;
}

export class ListAdaptersQueryDto {
  @IsString()
  @IsOptional()
  workspaceId?: string;

  @IsString()
  @IsOptional()
  provider?: string;
}

export class AdapterResponseDto<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    providerCode?: string;
    providerMessage?: string;
    statusCode?: number;
    retryable?: boolean;
    retryAfter?: number;
    metadata?: Record<string, any>;
  };
  pagination?: {
    totalCount?: number;
    totalPages?: number;
    currentPage?: number;
    pageSize?: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
    nextCursor?: string;
    previousCursor?: string;
  };
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: Date;
    retryAfter?: number;
  };
  metadata?: {
    requestId: string;
    duration: number;
    attempts: number;
    timestamp: Date;
  };
}

export class AdapterCapabilitiesResponseDto {
  provider: string;
  apiVersion: ApiVersion;
  supportedCapabilities: AdapterCapability[];
  supportedOperations: AdapterOperation[];
  rateLimits?: {
    [operation: string]: {
      maxRequests: number;
      windowMs: number;
    };
  };
  batchSizes?: {
    [operation: string]: number;
  };
  webhookSupport?: {
    maxWebhooks: number;
    supportedEvents: string[];
  };
}

export class AdapterHealthCheckResponseDto {
  status: AdapterStatus;
  lastChecked: Date;
  responseTime?: number;
  errors?: Array<{
    code: string;
    message: string;
  }>;
  metadata?: Record<string, any>;
}

export class AdapterConnectionTestResponseDto {
  success: boolean;
  provider: string;
  accountId: string;
  testedAt: Date;
  responseTime: number;
  capabilities?: AdapterCapabilitiesResponseDto;
  error?: {
    code: string;
    message: string;
  };
}

export class RegisteredAdapterDto {
  provider: string;
  registered: boolean;
}

export class ActiveAdapterDto {
  provider: string;
  accountId: string;
  workspaceId: string;
  status: AdapterStatus;
  initializedAt: Date;
}
