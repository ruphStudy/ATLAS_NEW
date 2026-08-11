import {
  IsArray,
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
import {
  CapabilityDefinitionStatus,
  CapabilityOverrideScope,
  CapabilitySupportLevel,
  CapabilityOverrideStatus,
  IAiCapabilityLimits,
} from '../interfaces';

export class CapabilityLimitsDto implements IAiCapabilityLimits {
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxInputTokens?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxOutputTokens?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxBatchSize?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxInputSizeBytes?: number;
}

// ── Capability Definitions ────────────────────────────────────

export class CreateAiCapabilityDefinitionDto {
  @IsEnum(AiCapability)
  capabilityKey!: AiCapability;

  @IsString()
  version!: string;

  @IsString()
  displayName!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  inputSchema?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  outputSchema?: Record<string, unknown>;

  @ValidateNested()
  @Type(() => CapabilityLimitsDto)
  @IsOptional()
  limits?: CapabilityLimitsDto;

  @IsArray()
  @IsEnum(AiCapability, { each: true })
  @IsOptional()
  dependencies?: AiCapability[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredRoles?: string[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateAiCapabilityDefinitionDto {
  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  inputSchema?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  outputSchema?: Record<string, unknown>;

  @ValidateNested()
  @Type(() => CapabilityLimitsDto)
  @IsOptional()
  limits?: CapabilityLimitsDto;

  @IsArray()
  @IsEnum(AiCapability, { each: true })
  @IsOptional()
  dependencies?: AiCapability[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredRoles?: string[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class CreateAiCapabilityVersionDto extends UpdateAiCapabilityDefinitionDto {
  @IsString()
  version!: string;
}

export class AiCapabilityDefinitionFilterDto extends PaginationDto {
  @IsEnum(AiCapability)
  @IsOptional()
  capabilityKey?: AiCapability;

  @IsEnum(CapabilityDefinitionStatus)
  @IsOptional()
  status?: CapabilityDefinitionStatus;
}

export class AiCapabilityDefinitionResponseDto {
  id!: string;
  capabilityKey!: AiCapability;
  version!: string;
  status!: CapabilityDefinitionStatus;
  displayName!: string;
  description?: string | null;
  inputSchema?: Record<string, unknown> | null;
  outputSchema?: Record<string, unknown> | null;
  limits!: IAiCapabilityLimits;
  dependencies!: AiCapability[];
  requiredRoles!: string[];
  metadata?: Record<string, unknown>;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): AiCapabilityDefinitionResponseDto {
    const dto = new AiCapabilityDefinitionResponseDto();
    Object.assign(dto, {
      id: raw['id'],
      capabilityKey: raw['capabilityKey'],
      version: raw['version'],
      status: raw['status'],
      displayName: raw['displayName'],
      description: raw['description'],
      inputSchema: raw['inputSchema'],
      outputSchema: raw['outputSchema'],
      limits: raw['limits'],
      dependencies: raw['dependencies'],
      requiredRoles: raw['requiredRoles'],
      metadata: raw['metadata'],
      createdBy: raw['createdBy'],
      updatedBy: raw['updatedBy'],
      createdAt: raw['createdAt'],
      updatedAt: raw['updatedAt'],
    });
    return dto;
  }
}

export class PaginatedAiCapabilityDefinitionResponseDto {
  data!: AiCapabilityDefinitionResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  hasMore!: boolean;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedAiCapabilityDefinitionResponseDto {
    const dto = new PaginatedAiCapabilityDefinitionResponseDto();
    dto.data = items.map((i) => AiCapabilityDefinitionResponseDto.from(i));
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.hasMore = page * limit < total;
    return dto;
  }
}

// ── Capability Overrides ───────────────────────────────────────

export class CreateAiCapabilityOverrideDto {
  @IsEnum(CapabilityOverrideScope)
  scope!: CapabilityOverrideScope;

  @IsEnum(AiCapability)
  capabilityKey!: AiCapability;

  @IsString()
  @IsOptional()
  providerKey?: string;

  @IsString()
  @IsOptional()
  modelId?: string;

  @IsEnum(CapabilitySupportLevel)
  supportLevel!: CapabilitySupportLevel;

  @IsString()
  @IsOptional()
  featureFlag?: string;

  @IsObject()
  @IsOptional()
  schemaOverride?: Record<string, unknown>;

  @ValidateNested()
  @Type(() => CapabilityLimitsDto)
  @IsOptional()
  limitsOverride?: CapabilityLimitsDto;

  @IsNumber()
  @Min(0)
  @Max(1000)
  @IsOptional()
  priority?: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateAiCapabilityOverrideDto {
  @IsEnum(CapabilitySupportLevel)
  @IsOptional()
  supportLevel?: CapabilitySupportLevel;

  @IsString()
  @IsOptional()
  featureFlag?: string;

  @IsObject()
  @IsOptional()
  schemaOverride?: Record<string, unknown>;

  @ValidateNested()
  @Type(() => CapabilityLimitsDto)
  @IsOptional()
  limitsOverride?: CapabilityLimitsDto;

  @IsNumber()
  @Min(0)
  @Max(1000)
  @IsOptional()
  priority?: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class AiCapabilityOverrideFilterDto extends PaginationDto {
  @IsEnum(CapabilityOverrideScope)
  @IsOptional()
  scope?: CapabilityOverrideScope;

  @IsEnum(AiCapability)
  @IsOptional()
  capabilityKey?: AiCapability;

  @IsString()
  @IsOptional()
  providerKey?: string;

  @IsString()
  @IsOptional()
  modelId?: string;

  @IsEnum(CapabilityOverrideStatus)
  @IsOptional()
  status?: CapabilityOverrideStatus;
}

export class AiCapabilityOverrideResponseDto {
  id!: string;
  scope!: CapabilityOverrideScope;
  capabilityKey!: AiCapability;
  workspaceId?: string | null;
  providerKey?: string | null;
  modelId?: string | null;
  supportLevel!: CapabilitySupportLevel;
  status!: CapabilityOverrideStatus;
  featureFlag?: string | null;
  schemaOverride?: Record<string, unknown> | null;
  limitsOverride?: IAiCapabilityLimits | null;
  priority!: number;
  metadata?: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): AiCapabilityOverrideResponseDto {
    const dto = new AiCapabilityOverrideResponseDto();
    Object.assign(dto, {
      id: raw['id'],
      scope: raw['scope'],
      capabilityKey: raw['capabilityKey'],
      workspaceId: raw['workspaceId'],
      providerKey: raw['providerKey'],
      modelId: raw['modelId'],
      supportLevel: raw['supportLevel'],
      status: raw['status'],
      featureFlag: raw['featureFlag'],
      schemaOverride: raw['schemaOverride'],
      limitsOverride: raw['limitsOverride'],
      priority: raw['priority'],
      metadata: raw['metadata'],
      createdAt: raw['createdAt'],
      updatedAt: raw['updatedAt'],
    });
    return dto;
  }
}

export class PaginatedAiCapabilityOverrideResponseDto {
  data!: AiCapabilityOverrideResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  hasMore!: boolean;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedAiCapabilityOverrideResponseDto {
    const dto = new PaginatedAiCapabilityOverrideResponseDto();
    dto.data = items.map((i) => AiCapabilityOverrideResponseDto.from(i));
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.hasMore = page * limit < total;
    return dto;
  }
}

// ── Resolution ─────────────────────────────────────────────────

export class ResolveAiCapabilityDto {
  @IsEnum(AiCapability)
  capabilityKey!: AiCapability;

  @IsString()
  @IsOptional()
  providerKey?: string;

  @IsString()
  @IsOptional()
  modelId?: string;

  @IsString()
  @IsOptional()
  useCase?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsString()
  @IsOptional()
  featureFlags?: string;
}
