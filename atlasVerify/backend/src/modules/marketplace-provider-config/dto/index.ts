import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  ConfigurationFilterOptions,
  ConfigurationScope,
  ConfigurationStatus,
  IMarketplaceProviderConfig,
  IMarketplaceProviderConfigHistory,
  MarketplaceProviderConfigPayload,
} from '../interfaces';

// ── Create / Update ───────────────────────────────────────────

export class CreateMarketplaceProviderConfigDto {
  @IsString()
  providerKey!: string;

  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ConfigurationScope)
  @IsOptional()
  scope?: ConfigurationScope;

  @IsString()
  @IsOptional()
  accountId?: string;

  @IsObject()
  @IsOptional()
  payload?: MarketplaceProviderConfigPayload;
}

export class UpdateMarketplaceProviderConfigDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  payload?: Partial<MarketplaceProviderConfigPayload>;
}

export class CloneMarketplaceProviderConfigDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  targetWorkspaceId?: string;
}

export class PublishMarketplaceProviderConfigDto {
  @IsString()
  @IsOptional()
  approvedBy?: string;

  @IsString()
  @IsOptional()
  changeReason?: string;
}

export class RollbackMarketplaceProviderConfigDto {
  @IsNumber()
  @Min(1)
  toVersion!: number;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class ConfigFilterDto implements ConfigurationFilterOptions {
  @IsString()
  @IsOptional()
  workspaceId?: string;

  @IsString()
  @IsOptional()
  providerKey?: string;

  @IsString()
  @IsOptional()
  accountId?: string;

  @IsString()
  @IsOptional()
  marketplaceKey?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsOptional()
  status?: ConfigurationStatus | ConfigurationStatus[];

  @IsEnum(ConfigurationScope)
  @IsOptional()
  scope?: ConfigurationScope;

  @IsString()
  @IsOptional()
  search?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}

// ── Response DTOs ─────────────────────────────────────────────

export class MarketplaceProviderConfigResponseDto {
  id!: string;
  workspaceId?: string | null;
  scope!: ConfigurationScope;
  providerKey!: string;
  accountId?: string | null;
  name!: string;
  description?: string | null;
  status!: ConfigurationStatus;
  version!: number;
  publishedVersion?: number | null;
  payload!: MarketplaceProviderConfigPayload;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  approvedBy?: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): MarketplaceProviderConfigResponseDto {
    const dto = new MarketplaceProviderConfigResponseDto();
    Object.assign(dto, {
      id: raw['id'],
      workspaceId: raw['workspaceId'],
      scope: raw['scope'],
      providerKey: raw['providerKey'],
      accountId: raw['accountId'],
      name: raw['name'],
      description: raw['description'],
      status: raw['status'],
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

export class MarketplaceProviderConfigHistoryResponseDto {
  id!: string;
  configId!: string;
  providerKey!: string;
  version!: number;
  status!: ConfigurationStatus;
  payload!: MarketplaceProviderConfigPayload;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt!: Date;

  static from(raw: Record<string, unknown>): MarketplaceProviderConfigHistoryResponseDto {
    const dto = new MarketplaceProviderConfigHistoryResponseDto();
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

export class PaginatedConfigResponseDto {
  items!: MarketplaceProviderConfigResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  hasMore!: boolean;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedConfigResponseDto {
    const dto = new PaginatedConfigResponseDto();
    dto.items = items.map((i) => MarketplaceProviderConfigResponseDto.from(i));
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.hasMore = page * limit < total;
    return dto;
  }
}

export class ConfigImportDto {
  @IsString()
  providerKey!: string;

  @IsObject()
  payload!: MarketplaceProviderConfigPayload;

  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  overwriteExisting?: boolean;
}
