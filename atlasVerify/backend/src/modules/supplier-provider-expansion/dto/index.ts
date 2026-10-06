import {
  AdapterCompatibilityStatus,
  EligibilityScope,
  ISupplierProviderExpansion,
  ISupplierProviderExpansionHistory,
  SupplierProviderRolloutState,
} from '../interfaces';

// ── Expansion ────────────────────────────────────────────────────

export class OnboardSupplierProviderDto {
  providerCode!: string;
  workspaceId?: string;
  organizationId?: string;
  apiVersionLabel?: string;
  countryCodes?: string[];
  regionCodes?: string[];
  currencyCodes?: string[];
  integrationStrategies?: string[];
  eligibilityScope?: EligibilityScope;
  eligibleWorkspaceIds?: string[];
  backwardCompatibleApiVersions?: string[];
  fallbackProviderCode?: string;
  endpointConfig?: Record<string, unknown>;
  rateLimitConfig?: Record<string, unknown>;
  featureFlags?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export class UpdateSupplierProviderExpansionDto {
  apiVersionLabel?: string;
  countryCodes?: string[];
  regionCodes?: string[];
  currencyCodes?: string[];
  integrationStrategies?: string[];
  eligibilityScope?: EligibilityScope;
  eligibleWorkspaceIds?: string[];
  backwardCompatibleApiVersions?: string[];
  fallbackProviderCode?: string;
  endpointConfig?: Record<string, unknown>;
  rateLimitConfig?: Record<string, unknown>;
  featureFlags?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  changeReason?: string;
}

export class PromoteRolloutDto {
  targetState!: SupplierProviderRolloutState;
  reason?: string;
}

export class SupplierProviderExpansionFilterDto {
  providerCode?: string;
  workspaceId?: string;
  organizationId?: string;
  rolloutState?: SupplierProviderRolloutState;
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

export class SupplierProviderExpansionResponseDto {
  id!: string;
  providerCode!: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  rolloutState!: SupplierProviderRolloutState;
  version!: number;
  apiVersionLabel?: string | null;
  countryCodes!: string[];
  regionCodes!: string[];
  currencyCodes!: string[];
  integrationStrategies!: string[];
  eligibilityScope!: EligibilityScope;
  eligibleWorkspaceIds!: string[];
  adapterCompatibilityStatus!: AdapterCompatibilityStatus;
  compatibilityIssues!: string[];
  backwardCompatibleApiVersions!: string[];
  fallbackProviderCode?: string | null;
  endpointConfig!: Record<string, unknown>;
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

  static from(expansion: ISupplierProviderExpansion): SupplierProviderExpansionResponseDto {
    const dto = new SupplierProviderExpansionResponseDto();
    dto.id = expansion.id;
    dto.providerCode = expansion.providerCode;
    dto.workspaceId = expansion.workspaceId;
    dto.organizationId = expansion.organizationId;
    dto.rolloutState = expansion.rolloutState;
    dto.version = expansion.version;
    dto.apiVersionLabel = expansion.apiVersionLabel;
    dto.countryCodes = expansion.countryCodes;
    dto.regionCodes = expansion.regionCodes;
    dto.currencyCodes = expansion.currencyCodes;
    dto.integrationStrategies = expansion.integrationStrategies;
    dto.eligibilityScope = expansion.eligibilityScope;
    dto.eligibleWorkspaceIds = expansion.eligibleWorkspaceIds;
    dto.adapterCompatibilityStatus = expansion.adapterCompatibilityStatus;
    dto.compatibilityIssues = expansion.compatibilityIssues;
    dto.backwardCompatibleApiVersions = expansion.backwardCompatibleApiVersions;
    dto.fallbackProviderCode = expansion.fallbackProviderCode;
    dto.endpointConfig = expansion.endpointConfig;
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

export class PaginatedSupplierProviderExpansionResponseDto {
  items!: SupplierProviderExpansionResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class SupplierProviderExpansionHistoryResponseDto {
  id!: string;
  expansionId!: string;
  version!: number;
  rolloutState!: SupplierProviderRolloutState;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt!: Date;

  static from(entry: ISupplierProviderExpansionHistory): SupplierProviderExpansionHistoryResponseDto {
    const dto = new SupplierProviderExpansionHistoryResponseDto();
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
