import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AiCapability } from '../../../ai/interfaces';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { AiConfigScope, AiConfigStatus, IAiProviderConfigPayload } from '../interfaces';
import { AI_CONFIG_CONSTANTS } from '../constants';

// ── Nested policy / sub-section DTOs ──────────────────────────

export class TimeoutPolicyDto {
  @IsNumber()
  @Min(AI_CONFIG_CONSTANTS.MIN_TIMEOUT_MS)
  @Max(AI_CONFIG_CONSTANTS.MAX_TIMEOUT_MS)
  requestTimeoutMs!: number;

  @IsNumber()
  @IsOptional()
  connectTimeoutMs?: number;
}

export class RetryPolicyDto {
  @IsNumber()
  @Min(1)
  @Max(20)
  maxAttempts!: number;

  @IsNumber()
  @Min(0)
  backoffMs!: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  backoffMultiplier?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  retryableErrorCodes?: string[];
}

export class RateLimitPolicyDto {
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxRequestsPerMinute?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxTokensPerMinute?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxConcurrentRequests?: number;
}

export class FallbackPolicyDto {
  @IsArray()
  @IsString({ each: true })
  fallbackProviderKeys!: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fallbackOnErrorCodes?: string[];
}

export class ModelDescriptorDto {
  @IsString()
  modelId!: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsArray()
  @IsEnum(AiCapability, { each: true })
  capabilities!: AiCapability[];

  @IsNumber()
  @IsOptional()
  contextWindowTokens?: number;

  @IsNumber()
  @IsOptional()
  maxOutputTokens?: number;

  @IsNumber()
  @IsOptional()
  inputCostPer1kTokens?: number;

  @IsNumber()
  @IsOptional()
  outputCostPer1kTokens?: number;

  @IsBoolean()
  @IsOptional()
  deprecated?: boolean;
}

export class ConcurrencyConfigDto {
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxConcurrentRequests?: number;
}

export class QueueSettingsDto {
  @IsString()
  @IsOptional()
  queueName?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxQueueSize?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  concurrency?: number;
}

export class ModelParametersDto {
  @IsNumber()
  @Min(AI_CONFIG_CONSTANTS.MIN_TEMPERATURE)
  @Max(AI_CONFIG_CONSTANTS.MAX_TEMPERATURE)
  @IsOptional()
  temperature?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxTokens?: number;

  @IsNumber()
  @Min(AI_CONFIG_CONSTANTS.MIN_TOP_P)
  @Max(AI_CONFIG_CONSTANTS.MAX_TOP_P)
  @IsOptional()
  topP?: number;

  @IsNumber()
  @IsOptional()
  seed?: number;

  @IsString()
  @IsOptional()
  responseFormat?: string;
}

export class UsageLimitsDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxTokensPerRequest?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxTokensPerDay?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxRequestsPerDay?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxCostPerDayUsd?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxCostPerMonthUsd?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  budgetAlertThresholdPercent?: number;
}

export class CachingConfigDto {
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  ttlSeconds?: number;
}

export class LoggingConfigDto {
  @IsBoolean()
  @IsOptional()
  logRequests?: boolean;

  @IsBoolean()
  @IsOptional()
  logResponses?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  redactFields?: string[];
}

export class SafetyConfigDto {
  @IsBoolean()
  @IsOptional()
  contentFilterEnabled?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  blockedTerms?: string[];

  @IsBoolean()
  @IsOptional()
  piiRedactionEnabled?: boolean;
}

export class ValidationOptionsDto {
  @IsBoolean()
  @IsOptional()
  schemaValidationEnabled?: boolean;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxInputLength?: number;
}

export class ProviderCredentialsRefDto {
  @IsString()
  credentialRef!: string;

  @IsString()
  @IsOptional()
  type?: string;
}

export class AiProviderConfigPayloadDto {
  @IsArray()
  @IsEnum(AiCapability, { each: true })
  @IsOptional()
  capabilities?: AiCapability[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModelDescriptorDto)
  @IsOptional()
  models?: ModelDescriptorDto[];

  @IsString()
  @IsOptional()
  defaultModelId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fallbackOrder?: string[];

  @IsString()
  @IsOptional()
  baseUrl?: string;

  @IsString()
  @IsOptional()
  apiVersion?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @ValidateNested()
  @Type(() => TimeoutPolicyDto)
  @IsOptional()
  timeoutPolicy?: TimeoutPolicyDto;

  @ValidateNested()
  @Type(() => RetryPolicyDto)
  @IsOptional()
  retryPolicy?: RetryPolicyDto;

  @ValidateNested()
  @Type(() => RateLimitPolicyDto)
  @IsOptional()
  rateLimitPolicy?: RateLimitPolicyDto;

  @ValidateNested()
  @Type(() => FallbackPolicyDto)
  @IsOptional()
  fallbackPolicy?: FallbackPolicyDto;

  @ValidateNested()
  @Type(() => ConcurrencyConfigDto)
  @IsOptional()
  concurrency?: ConcurrencyConfigDto;

  @ValidateNested()
  @Type(() => QueueSettingsDto)
  @IsOptional()
  queue?: QueueSettingsDto;

  @ValidateNested()
  @Type(() => ModelParametersDto)
  @IsOptional()
  modelParameters?: ModelParametersDto;

  @ValidateNested()
  @Type(() => UsageLimitsDto)
  @IsOptional()
  limits?: UsageLimitsDto;

  @IsObject()
  @IsOptional()
  featureFlags?: Record<string, boolean>;

  @ValidateNested()
  @Type(() => CachingConfigDto)
  @IsOptional()
  caching?: CachingConfigDto;

  @ValidateNested()
  @Type(() => LoggingConfigDto)
  @IsOptional()
  logging?: LoggingConfigDto;

  @ValidateNested()
  @Type(() => SafetyConfigDto)
  @IsOptional()
  safety?: SafetyConfigDto;

  @ValidateNested()
  @Type(() => ValidationOptionsDto)
  @IsOptional()
  validation?: ValidationOptionsDto;

  @ValidateNested()
  @Type(() => ProviderCredentialsRefDto)
  @IsOptional()
  credentials?: ProviderCredentialsRefDto;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

// ── Create / Update / Publish / Rollback / Clone ──────────────

export class CreateAiProviderConfigDto {
  @IsEnum(AiConfigScope)
  scope!: AiConfigScope;

  @IsString()
  providerKey!: string;

  @IsString()
  @IsOptional()
  useCase?: string;

  @IsString()
  @IsOptional()
  modelId?: string;

  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(AI_CONFIG_CONSTANTS.MIN_PRIORITY)
  @Max(AI_CONFIG_CONSTANTS.MAX_PRIORITY)
  @IsOptional()
  priority?: number;

  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @IsDateString()
  @IsOptional()
  effectiveTo?: string;

  @ValidateNested()
  @Type(() => AiProviderConfigPayloadDto)
  @IsOptional()
  payload?: AiProviderConfigPayloadDto;
}

export class UpdateAiProviderConfigDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(AI_CONFIG_CONSTANTS.MIN_PRIORITY)
  @Max(AI_CONFIG_CONSTANTS.MAX_PRIORITY)
  @IsOptional()
  priority?: number;

  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @IsDateString()
  @IsOptional()
  effectiveTo?: string;

  @ValidateNested()
  @Type(() => AiProviderConfigPayloadDto)
  @IsOptional()
  payload?: Partial<AiProviderConfigPayloadDto>;
}

export class PublishAiProviderConfigDto {
  @IsString()
  @IsOptional()
  approvedBy?: string;

  @IsString()
  @IsOptional()
  changeReason?: string;
}

export class RollbackAiProviderConfigDto {
  @IsNumber()
  @Min(1)
  toVersion!: number;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class CloneAiProviderConfigDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  targetWorkspaceId?: string;
}

// ── Filter ─────────────────────────────────────────────────────

export class AiProviderConfigFilterDto extends PaginationDto {
  @IsString()
  @IsOptional()
  providerKey?: string;

  @IsString()
  @IsOptional()
  useCase?: string;

  @IsString()
  @IsOptional()
  modelId?: string;

  @IsEnum(AiConfigScope)
  @IsOptional()
  scope?: AiConfigScope;

  @IsEnum(AiConfigStatus)
  @IsOptional()
  status?: AiConfigStatus;
}

// ── Response DTOs ──────────────────────────────────────────────

export class AiProviderConfigResponseDto {
  id!: string;
  workspaceId?: string | null;
  scope!: AiConfigScope;
  providerKey!: string;
  useCase?: string | null;
  modelId?: string | null;
  name!: string;
  description?: string | null;
  status!: AiConfigStatus;
  priority!: number;
  version!: number;
  publishedVersion?: number | null;
  payload!: IAiProviderConfigPayload;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  approvedBy?: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): AiProviderConfigResponseDto {
    const dto = new AiProviderConfigResponseDto();
    Object.assign(dto, {
      id: raw['id'],
      workspaceId: raw['workspaceId'],
      scope: raw['scope'],
      providerKey: raw['providerKey'],
      useCase: raw['useCase'],
      modelId: raw['modelId'],
      name: raw['name'],
      description: raw['description'],
      status: raw['status'],
      priority: raw['priority'],
      version: raw['version'],
      publishedVersion: raw['publishedVersion'],
      payload: raw['payload'],
      effectiveFrom: raw['effectiveFrom'],
      effectiveTo: raw['effectiveTo'],
      createdBy: raw['createdBy'],
      updatedBy: raw['updatedBy'],
      approvedBy: raw['approvedBy'],
      createdAt: raw['createdAt'],
      updatedAt: raw['updatedAt'],
    });
    return dto;
  }
}

export class AiProviderConfigHistoryResponseDto {
  id!: string;
  configId!: string;
  providerKey!: string;
  version!: number;
  status!: AiConfigStatus;
  payload!: IAiProviderConfigPayload;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt!: Date;

  static from(raw: Record<string, unknown>): AiProviderConfigHistoryResponseDto {
    const dto = new AiProviderConfigHistoryResponseDto();
    Object.assign(dto, {
      id: raw['id'],
      configId: raw['configId'],
      providerKey: raw['providerKey'],
      version: raw['version'],
      status: raw['status'],
      payload: raw['payload'],
      changeReason: raw['changeReason'],
      changedBy: raw['changedBy'],
      createdAt: raw['createdAt'],
    });
    return dto;
  }
}

export class PaginatedAiProviderConfigResponseDto {
  data!: AiProviderConfigResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  hasMore!: boolean;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedAiProviderConfigResponseDto {
    const dto = new PaginatedAiProviderConfigResponseDto();
    dto.data = items.map((i) => AiProviderConfigResponseDto.from(i));
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.hasMore = page * limit < total;
    return dto;
  }
}
