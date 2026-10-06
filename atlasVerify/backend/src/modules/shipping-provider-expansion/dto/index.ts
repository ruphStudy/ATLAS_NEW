import {
  AdapterCompatibilityStatus,
  EligibilityScope,
  IShippingProviderExpansion,
  IShippingProviderExpansionHistory,
  ShippingProviderRolloutState,
} from '../interfaces';

// ── Expansion ────────────────────────────────────────────────────

export class OnboardShippingProviderDto {
  providerKey!: string;
  workspaceId?: string;
  organizationId?: string;
  apiVersionLabel?: string;
  countryCodes?: string[];
  regionCodes?: string[];
  serviceLevels?: string[];
  eligibilityScope?: EligibilityScope;
  eligibleWorkspaceIds?: string[];
  backwardCompatibleApiVersions?: string[];
  fallbackProviderKey?: string;
  pickupRules?: Record<string, unknown>;
  rateLimitConfig?: Record<string, unknown>;
  featureFlags?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export class UpdateShippingProviderExpansionDto {
  apiVersionLabel?: string;
  countryCodes?: string[];
  regionCodes?: string[];
  serviceLevels?: string[];
  eligibilityScope?: EligibilityScope;
  eligibleWorkspaceIds?: string[];
  backwardCompatibleApiVersions?: string[];
  fallbackProviderKey?: string;
  pickupRules?: Record<string, unknown>;
  rateLimitConfig?: Record<string, unknown>;
  featureFlags?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  changeReason?: string;
}

export class PromoteRolloutDto {
  targetState!: ShippingProviderRolloutState;
  reason?: string;
}

export class ShippingProviderExpansionFilterDto {
  providerKey?: string;
  workspaceId?: string;
  organizationId?: string;
  rolloutState?: ShippingProviderRolloutState;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class CheckEligibilityDto {
  workspaceId!: string;
  countryCode?: string;
}

// ── Response DTOs ────────────────────────────────────────────────

export class ShippingProviderExpansionResponseDto {
  id!: string;
  providerKey!: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  rolloutState!: ShippingProviderRolloutState;
  version!: number;
  apiVersionLabel?: string | null;
  countryCodes!: string[];
  regionCodes!: string[];
  serviceLevels!: string[];
  eligibilityScope!: EligibilityScope;
  eligibleWorkspaceIds!: string[];
  adapterCompatibilityStatus!: AdapterCompatibilityStatus;
  compatibilityIssues!: string[];
  backwardCompatibleApiVersions!: string[];
  fallbackProviderKey?: string | null;
  pickupRules!: Record<string, unknown>;
  rateLimitConfig!: Record<string, unknown>;
  featureFlags!: Record<string, unknown>;
  onboardedAt?: Date | null;
  betaAt?: Date | null;
  activatedAt?: Date | null;
  deprecatedAt?: Date | null;
  disabledAt?: Date | null;
  settings!: Record<string, unknown>;
  metadata!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;

  static from(expansion: IShippingProviderExpansion): ShippingProviderExpansionResponseDto {
    const dto = new ShippingProviderExpansionResponseDto();
    dto.id = expansion.id;
    dto.providerKey = expansion.providerKey;
    dto.workspaceId = expansion.workspaceId;
    dto.organizationId = expansion.organizationId;
    dto.rolloutState = expansion.rolloutState;
    dto.version = expansion.version;
    dto.apiVersionLabel = expansion.apiVersionLabel;
    dto.countryCodes = expansion.countryCodes;
    dto.regionCodes = expansion.regionCodes;
    dto.serviceLevels = expansion.serviceLevels;
    dto.eligibilityScope = expansion.eligibilityScope;
    dto.eligibleWorkspaceIds = expansion.eligibleWorkspaceIds;
    dto.adapterCompatibilityStatus = expansion.adapterCompatibilityStatus;
    dto.compatibilityIssues = expansion.compatibilityIssues;
    dto.backwardCompatibleApiVersions = expansion.backwardCompatibleApiVersions;
    dto.fallbackProviderKey = expansion.fallbackProviderKey;
    dto.pickupRules = expansion.pickupRules;
    dto.rateLimitConfig = expansion.rateLimitConfig;
    dto.featureFlags = expansion.featureFlags;
    dto.onboardedAt = expansion.onboardedAt;
    dto.betaAt = expansion.betaAt;
    dto.activatedAt = expansion.activatedAt;
    dto.deprecatedAt = expansion.deprecatedAt;
    dto.disabledAt = expansion.disabledAt;
    dto.settings = expansion.settings;
    dto.metadata = expansion.metadata;
    dto.createdAt = expansion.createdAt;
    dto.updatedAt = expansion.updatedAt;
    return dto;
  }
}

export class PaginatedShippingProviderExpansionResponseDto {
  items!: ShippingProviderExpansionResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class ShippingProviderExpansionHistoryResponseDto {
  id!: string;
  expansionId!: string;
  version!: number;
  rolloutState!: ShippingProviderRolloutState;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt!: Date;

  static from(entry: IShippingProviderExpansionHistory): ShippingProviderExpansionHistoryResponseDto {
    const dto = new ShippingProviderExpansionHistoryResponseDto();
    dto.id = entry.id;
    dto.expansionId = entry.expansionId;
    dto.version = entry.version;
    dto.rolloutState = entry.rolloutState;
    dto.changeReason = entry.changeReason;
    dto.changedBy = entry.changedBy;
    dto.createdAt = entry.createdAt;
    return dto;
  }
}
