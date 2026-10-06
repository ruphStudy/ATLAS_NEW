import { ChannelStatus, ChannelType, IChannel, IChannelHistory, IChannelProductMapping } from '../interfaces';

// ── Channel ──────────────────────────────────────────────────────

export class RegisterChannelDto {
  workspaceId!: string;
  organizationId?: string;
  businessId?: string;
  brandId?: string;
  channelType!: ChannelType;
  channelKey!: string;
  providerKey?: string;
  marketplaceAccountId?: string;
  externalAccountRef?: string;
  name!: string;
  capabilities?: string[];
  routingRules?: Record<string, unknown>;
  rateLimitConfig?: Record<string, unknown>;
  retryConfig?: Record<string, unknown>;
  regionalSettingsProfileKey?: string;
  taxJurisdictionCode?: string;
  complianceProfileKey?: string;
  settings?: Record<string, unknown>;
  priority?: number;
  metadata?: Record<string, unknown>;
}

export class UpdateChannelDto {
  name?: string;
  providerKey?: string;
  marketplaceAccountId?: string;
  externalAccountRef?: string;
  businessId?: string;
  brandId?: string;
  capabilities?: string[];
  routingRules?: Record<string, unknown>;
  rateLimitConfig?: Record<string, unknown>;
  retryConfig?: Record<string, unknown>;
  regionalSettingsProfileKey?: string;
  taxJurisdictionCode?: string;
  complianceProfileKey?: string;
  settings?: Record<string, unknown>;
  priority?: number;
  metadata?: Record<string, unknown>;
  changeReason?: string;
}

export class ChannelReasonDto {
  reason?: string;
}

export class ChannelFilterDto {
  workspaceId?: string;
  organizationId?: string;
  businessId?: string;
  brandId?: string;
  channelType?: ChannelType;
  status?: ChannelStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ── Routing ──────────────────────────────────────────────────────

export class ResolveChannelsDto {
  businessId?: string;
  brandId?: string;
  channelType?: ChannelType;
  capability?: string;
}

// ── Product Mapping ──────────────────────────────────────────────

export class CreateChannelProductMappingDto {
  internalProductId!: string;
  externalSku?: string;
  externalProductId?: string;
  externalUrl?: string;
  metadata?: Record<string, unknown>;
}

export class UpdateChannelProductMappingDto {
  externalSku?: string;
  externalProductId?: string;
  externalUrl?: string;
  syncStatus?: 'PENDING' | 'SYNCED' | 'FAILED';
  metadata?: Record<string, unknown>;
}

// ── Idempotent Operation ─────────────────────────────────────────

export class ExecuteChannelOperationDto {
  operationType!: string;
  idempotencyKey!: string;
  payload?: Record<string, unknown>;
}

// ── Response DTOs ────────────────────────────────────────────────

export class ChannelResponseDto {
  id!: string;
  workspaceId!: string;
  organizationId?: string | null;
  businessId?: string | null;
  brandId?: string | null;
  channelType!: ChannelType;
  channelKey!: string;
  providerKey?: string | null;
  marketplaceAccountId?: string | null;
  externalAccountRef?: string | null;
  name!: string;
  status!: ChannelStatus;
  version!: number;
  isDefault!: boolean;
  priority!: number;
  capabilities!: string[];
  routingRules!: Record<string, unknown>;
  rateLimitConfig?: Record<string, unknown> | null;
  retryConfig?: Record<string, unknown> | null;
  regionalSettingsProfileKey?: string | null;
  taxJurisdictionCode?: string | null;
  complianceProfileKey?: string | null;
  settings!: Record<string, unknown>;
  metadata!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;

  static from(channel: IChannel): ChannelResponseDto {
    const dto = new ChannelResponseDto();
    dto.id = channel.id;
    dto.workspaceId = channel.workspaceId;
    dto.organizationId = channel.organizationId;
    dto.businessId = channel.businessId;
    dto.brandId = channel.brandId;
    dto.channelType = channel.channelType;
    dto.channelKey = channel.channelKey;
    dto.providerKey = channel.providerKey;
    dto.marketplaceAccountId = channel.marketplaceAccountId;
    dto.externalAccountRef = channel.externalAccountRef;
    dto.name = channel.name;
    dto.status = channel.status;
    dto.version = channel.version;
    dto.isDefault = channel.isDefault;
    dto.priority = channel.priority;
    dto.capabilities = channel.capabilities;
    dto.routingRules = channel.routingRules;
    dto.rateLimitConfig = channel.rateLimitConfig;
    dto.retryConfig = channel.retryConfig;
    dto.regionalSettingsProfileKey = channel.regionalSettingsProfileKey;
    dto.taxJurisdictionCode = channel.taxJurisdictionCode;
    dto.complianceProfileKey = channel.complianceProfileKey;
    dto.settings = channel.settings;
    dto.metadata = channel.metadata;
    dto.createdAt = channel.createdAt;
    dto.updatedAt = channel.updatedAt;
    return dto;
  }
}

export class PaginatedChannelResponseDto {
  items!: ChannelResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class ChannelHistoryResponseDto {
  id!: string;
  channelId!: string;
  version!: number;
  status!: ChannelStatus;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt!: Date;

  static from(entry: IChannelHistory): ChannelHistoryResponseDto {
    const dto = new ChannelHistoryResponseDto();
    dto.id = entry.id;
    dto.channelId = entry.channelId;
    dto.version = entry.version;
    dto.status = entry.status;
    dto.changeReason = entry.changeReason;
    dto.changedBy = entry.changedBy;
    dto.createdAt = entry.createdAt;
    return dto;
  }
}

export class ChannelProductMappingResponseDto {
  id!: string;
  channelId!: string;
  internalProductId!: string;
  externalSku?: string | null;
  externalProductId?: string | null;
  externalUrl?: string | null;
  syncStatus!: 'PENDING' | 'SYNCED' | 'FAILED';
  createdAt!: Date;
  updatedAt!: Date;

  static from(mapping: IChannelProductMapping): ChannelProductMappingResponseDto {
    const dto = new ChannelProductMappingResponseDto();
    dto.id = mapping.id;
    dto.channelId = mapping.channelId;
    dto.internalProductId = mapping.internalProductId;
    dto.externalSku = mapping.externalSku;
    dto.externalProductId = mapping.externalProductId;
    dto.externalUrl = mapping.externalUrl;
    dto.syncStatus = mapping.syncStatus;
    dto.createdAt = mapping.createdAt;
    dto.updatedAt = mapping.updatedAt;
    return dto;
  }
}
