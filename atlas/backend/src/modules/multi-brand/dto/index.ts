import { BrandStatus, IBrand, IBrandEntityLink, IBrandHistory } from '../interfaces';

// ── Brand ────────────────────────────────────────────────────────

export class CreateBrandDto {
  workspaceId!: string;
  organizationId?: string;
  code!: string;
  name!: string;
  legalOwner?: string;
  logoUrl?: string;
  domains?: string[];
  description?: string;
  countryCodes?: string[];
  regionCodes?: string[];
  currencyCodes?: string[];
  marketplaceAccountIds?: string[];
  localeCode?: string;
  regionalSettingsProfileKey?: string;
  taxJurisdictionCode?: string;
  complianceProfileKey?: string;
  fulfillmentPreferences?: Record<string, unknown>;
  seoDefaults?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  priority?: number;
  metadata?: Record<string, unknown>;
}

export class UpdateBrandDto {
  name?: string;
  legalOwner?: string;
  logoUrl?: string;
  domains?: string[];
  description?: string;
  countryCodes?: string[];
  regionCodes?: string[];
  currencyCodes?: string[];
  marketplaceAccountIds?: string[];
  localeCode?: string;
  regionalSettingsProfileKey?: string;
  taxJurisdictionCode?: string;
  complianceProfileKey?: string;
  fulfillmentPreferences?: Record<string, unknown>;
  seoDefaults?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  priority?: number;
  metadata?: Record<string, unknown>;
  changeReason?: string;
}

export class ChangeBrandOwnershipDto {
  legalOwner!: string;
  reason?: string;
}

export class BrandReasonDto {
  reason?: string;
}

export class BrandFilterDto {
  workspaceId?: string;
  organizationId?: string;
  code?: string;
  status?: BrandStatus;
  countryCode?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ── Entity Links ─────────────────────────────────────────────────

export class LinkBrandEntityDto {
  entityType!: string;
  entityId!: string;
  isShared?: boolean;
  isPrimary?: boolean;
}

// ── Response DTOs ────────────────────────────────────────────────

export class BrandResponseDto {
  id!: string;
  workspaceId!: string;
  organizationId?: string | null;
  code!: string;
  name!: string;
  legalOwner?: string | null;
  logoUrl?: string | null;
  domains!: string[];
  description?: string | null;
  status!: BrandStatus;
  version!: number;
  isDefault!: boolean;
  priority!: number;
  countryCodes!: string[];
  regionCodes!: string[];
  currencyCodes!: string[];
  marketplaceAccountIds!: string[];
  localeCode?: string | null;
  regionalSettingsProfileKey?: string | null;
  taxJurisdictionCode?: string | null;
  complianceProfileKey?: string | null;
  fulfillmentPreferences!: Record<string, unknown>;
  seoDefaults!: Record<string, unknown>;
  settings!: Record<string, unknown>;
  metadata!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;

  static from(brand: IBrand): BrandResponseDto {
    const dto = new BrandResponseDto();
    dto.id = brand.id;
    dto.workspaceId = brand.workspaceId;
    dto.organizationId = brand.organizationId;
    dto.code = brand.code;
    dto.name = brand.name;
    dto.legalOwner = brand.legalOwner;
    dto.logoUrl = brand.logoUrl;
    dto.domains = brand.domains;
    dto.description = brand.description;
    dto.status = brand.status;
    dto.version = brand.version;
    dto.isDefault = brand.isDefault;
    dto.priority = brand.priority;
    dto.countryCodes = brand.countryCodes;
    dto.regionCodes = brand.regionCodes;
    dto.currencyCodes = brand.currencyCodes;
    dto.marketplaceAccountIds = brand.marketplaceAccountIds;
    dto.localeCode = brand.localeCode;
    dto.regionalSettingsProfileKey = brand.regionalSettingsProfileKey;
    dto.taxJurisdictionCode = brand.taxJurisdictionCode;
    dto.complianceProfileKey = brand.complianceProfileKey;
    dto.fulfillmentPreferences = brand.fulfillmentPreferences;
    dto.seoDefaults = brand.seoDefaults;
    dto.settings = brand.settings;
    dto.metadata = brand.metadata;
    dto.createdAt = brand.createdAt;
    dto.updatedAt = brand.updatedAt;
    return dto;
  }
}

export class PaginatedBrandResponseDto {
  items!: BrandResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class BrandHistoryResponseDto {
  id!: string;
  brandId!: string;
  version!: number;
  status!: BrandStatus;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt!: Date;

  static from(entry: IBrandHistory): BrandHistoryResponseDto {
    const dto = new BrandHistoryResponseDto();
    dto.id = entry.id;
    dto.brandId = entry.brandId;
    dto.version = entry.version;
    dto.status = entry.status;
    dto.changeReason = entry.changeReason;
    dto.changedBy = entry.changedBy;
    dto.createdAt = entry.createdAt;
    return dto;
  }
}

export class BrandEntityLinkResponseDto {
  id!: string;
  brandId!: string;
  entityType!: string;
  entityId!: string;
  isShared!: boolean;
  isPrimary!: boolean;
  createdAt!: Date;

  static from(link: IBrandEntityLink): BrandEntityLinkResponseDto {
    const dto = new BrandEntityLinkResponseDto();
    dto.id = link.id;
    dto.brandId = link.brandId;
    dto.entityType = link.entityType;
    dto.entityId = link.entityId;
    dto.isShared = link.isShared;
    dto.isPrimary = link.isPrimary;
    dto.createdAt = link.createdAt;
    return dto;
  }
}
