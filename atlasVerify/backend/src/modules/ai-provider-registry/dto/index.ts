import {
  IsArray,
  IsBoolean,
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
  IAiProviderRegistryEntity,
  ProviderRegistrationStatus,
} from '../interfaces';
import { AI_PROVIDER_REGISTRY_CONSTANTS } from '../constants';

export class RegistryModelDescriptorDto {
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

// ── Create / Update ────────────────────────────────────────────

export class CreateAiProviderRegistryDto {
  @IsString()
  providerKey!: string;

  @IsString()
  adapterKey!: string;

  @IsString()
  displayName!: string;

  @IsString()
  version!: string;

  @IsBoolean()
  @IsOptional()
  isGlobal?: boolean;

  @IsArray()
  @IsEnum(AiCapability, { each: true })
  capabilities!: AiCapability[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegistryModelDescriptorDto)
  @IsOptional()
  supportedModels?: RegistryModelDescriptorDto[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  regions?: string[];

  @IsNumber()
  @Min(AI_PROVIDER_REGISTRY_CONSTANTS.MIN_PRIORITY)
  @Max(AI_PROVIDER_REGISTRY_CONSTANTS.MAX_PRIORITY)
  @IsOptional()
  priority?: number;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fallbackOrder?: string[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateAiProviderRegistryDto {
  @IsString()
  @IsOptional()
  adapterKey?: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  version?: string;

  @IsArray()
  @IsEnum(AiCapability, { each: true })
  @IsOptional()
  capabilities?: AiCapability[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegistryModelDescriptorDto)
  @IsOptional()
  supportedModels?: RegistryModelDescriptorDto[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  regions?: string[];

  @IsNumber()
  @Min(AI_PROVIDER_REGISTRY_CONSTANTS.MIN_PRIORITY)
  @Max(AI_PROVIDER_REGISTRY_CONSTANTS.MAX_PRIORITY)
  @IsOptional()
  priority?: number;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fallbackOrder?: string[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

// ── Filter ─────────────────────────────────────────────────────

export class AiProviderRegistryFilterDto extends PaginationDto {
  @IsString()
  @IsOptional()
  providerKey?: string;

  @IsString()
  @IsOptional()
  adapterKey?: string;

  @IsEnum(AiCapability)
  @IsOptional()
  capability?: AiCapability;

  @IsString()
  @IsOptional()
  modelId?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsEnum(ProviderRegistrationStatus)
  @IsOptional()
  status?: ProviderRegistrationStatus;
}

// ── Response DTOs ──────────────────────────────────────────────

export class AiProviderRegistryResponseDto {
  id!: string;
  workspaceId?: string | null;
  providerKey!: string;
  adapterKey!: string;
  displayName!: string;
  version!: string;
  status!: ProviderRegistrationStatus;
  capabilities!: AiCapability[];
  supportedModels!: IAiProviderRegistryEntity['supportedModels'];
  regions!: string[];
  priority!: number;
  isDefault!: boolean;
  fallbackOrder!: string[];
  metadata?: Record<string, unknown>;
  lastSyncedAt?: Date | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): AiProviderRegistryResponseDto {
    const dto = new AiProviderRegistryResponseDto();
    Object.assign(dto, {
      id: raw['id'],
      workspaceId: raw['workspaceId'],
      providerKey: raw['providerKey'],
      adapterKey: raw['adapterKey'],
      displayName: raw['displayName'],
      version: raw['version'],
      status: raw['status'],
      capabilities: raw['capabilities'],
      supportedModels: raw['supportedModels'],
      regions: raw['regions'],
      priority: raw['priority'],
      isDefault: raw['isDefault'],
      fallbackOrder: raw['fallbackOrder'],
      metadata: raw['metadata'],
      lastSyncedAt: raw['lastSyncedAt'],
      createdBy: raw['createdBy'],
      updatedBy: raw['updatedBy'],
      createdAt: raw['createdAt'],
      updatedAt: raw['updatedAt'],
    });
    return dto;
  }
}

export class PaginatedAiProviderRegistryResponseDto {
  data!: AiProviderRegistryResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  hasMore!: boolean;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedAiProviderRegistryResponseDto {
    const dto = new PaginatedAiProviderRegistryResponseDto();
    dto.data = items.map((i) => AiProviderRegistryResponseDto.from(i));
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.hasMore = page * limit < total;
    return dto;
  }
}

export class RegistrySyncResultResponseDto {
  synced!: number;
  created!: number;
  updated!: number;
  unchanged!: number;
}
