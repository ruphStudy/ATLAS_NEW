import { BusinessStatus, BusinessVisibilityScope, IBusiness, IBusinessContact, IBusinessEntityLink, IBusinessHistory } from '../interfaces';

// ── Business ─────────────────────────────────────────────────────

export class CreateBusinessDto {
  workspaceId!: string;
  organizationId?: string;
  parentBusinessId?: string;
  code!: string;
  name!: string;
  legalName?: string;
  businessType?: string;
  registrationNumber?: string;
  taxIdentifier?: string;
  countryCode?: string;
  regionCode?: string;
  currencyCode?: string;
  timezone?: string;
  contacts?: IBusinessContact[];
  visibilityScope?: BusinessVisibilityScope;
  workspaceIds?: string[];
  brandIds?: string[];
  warehouseIds?: string[];
  marketplaceAccountIds?: string[];
  supplierIds?: string[];
  regionalSettingsProfileKey?: string;
  taxJurisdictionCode?: string;
  complianceProfileKey?: string;
  billingAccountRef?: string;
  settings?: Record<string, unknown>;
  priority?: number;
  metadata?: Record<string, unknown>;
}

export class UpdateBusinessDto {
  name?: string;
  legalName?: string;
  businessType?: string;
  registrationNumber?: string;
  taxIdentifier?: string;
  countryCode?: string;
  regionCode?: string;
  currencyCode?: string;
  timezone?: string;
  contacts?: IBusinessContact[];
  visibilityScope?: BusinessVisibilityScope;
  workspaceIds?: string[];
  brandIds?: string[];
  warehouseIds?: string[];
  marketplaceAccountIds?: string[];
  supplierIds?: string[];
  regionalSettingsProfileKey?: string;
  taxJurisdictionCode?: string;
  complianceProfileKey?: string;
  billingAccountRef?: string;
  settings?: Record<string, unknown>;
  priority?: number;
  metadata?: Record<string, unknown>;
  changeReason?: string;
}

export class SetParentBusinessDto {
  parentBusinessId?: string; // omit/null to detach from the hierarchy
  reason?: string;
}

export class ChangeBusinessOwnershipDto {
  legalName?: string;
  registrationNumber?: string;
  taxIdentifier?: string;
  reason?: string;
}

export class BusinessReasonDto {
  reason?: string;
}

export class BusinessFilterDto {
  organizationId?: string;
  workspaceId?: string;
  parentBusinessId?: string;
  code?: string;
  status?: BusinessStatus;
  countryCode?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ── Entity Links ─────────────────────────────────────────────────

export class LinkBusinessEntityDto {
  entityType!: string;
  entityId!: string;
  isShared?: boolean;
  isPrimary?: boolean;
}

// ── Response DTOs ────────────────────────────────────────────────

export class BusinessResponseDto {
  id!: string;
  organizationId?: string | null;
  workspaceId!: string;
  parentBusinessId?: string | null;
  code!: string;
  name!: string;
  legalName?: string | null;
  businessType?: string | null;
  registrationNumber?: string | null;
  taxIdentifier?: string | null;
  countryCode?: string | null;
  regionCode?: string | null;
  currencyCode?: string | null;
  timezone?: string | null;
  contacts!: IBusinessContact[];
  status!: BusinessStatus;
  version!: number;
  isDefault!: boolean;
  priority!: number;
  visibilityScope!: BusinessVisibilityScope;
  workspaceIds!: string[];
  brandIds!: string[];
  warehouseIds!: string[];
  marketplaceAccountIds!: string[];
  supplierIds!: string[];
  regionalSettingsProfileKey?: string | null;
  taxJurisdictionCode?: string | null;
  complianceProfileKey?: string | null;
  billingAccountRef?: string | null;
  settings!: Record<string, unknown>;
  metadata!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;

  static from(business: IBusiness): BusinessResponseDto {
    const dto = new BusinessResponseDto();
    dto.id = business.id;
    dto.organizationId = business.organizationId;
    dto.workspaceId = business.workspaceId;
    dto.parentBusinessId = business.parentBusinessId;
    dto.code = business.code;
    dto.name = business.name;
    dto.legalName = business.legalName;
    dto.businessType = business.businessType;
    dto.registrationNumber = business.registrationNumber;
    dto.taxIdentifier = business.taxIdentifier;
    dto.countryCode = business.countryCode;
    dto.regionCode = business.regionCode;
    dto.currencyCode = business.currencyCode;
    dto.timezone = business.timezone;
    dto.contacts = business.contacts;
    dto.status = business.status;
    dto.version = business.version;
    dto.isDefault = business.isDefault;
    dto.priority = business.priority;
    dto.visibilityScope = business.visibilityScope;
    dto.workspaceIds = business.workspaceIds;
    dto.brandIds = business.brandIds;
    dto.warehouseIds = business.warehouseIds;
    dto.marketplaceAccountIds = business.marketplaceAccountIds;
    dto.supplierIds = business.supplierIds;
    dto.regionalSettingsProfileKey = business.regionalSettingsProfileKey;
    dto.taxJurisdictionCode = business.taxJurisdictionCode;
    dto.complianceProfileKey = business.complianceProfileKey;
    dto.billingAccountRef = business.billingAccountRef;
    dto.settings = business.settings;
    dto.metadata = business.metadata;
    dto.createdAt = business.createdAt;
    dto.updatedAt = business.updatedAt;
    return dto;
  }
}

export class PaginatedBusinessResponseDto {
  items!: BusinessResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class BusinessHistoryResponseDto {
  id!: string;
  businessId!: string;
  version!: number;
  status!: BusinessStatus;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt!: Date;

  static from(entry: IBusinessHistory): BusinessHistoryResponseDto {
    const dto = new BusinessHistoryResponseDto();
    dto.id = entry.id;
    dto.businessId = entry.businessId;
    dto.version = entry.version;
    dto.status = entry.status;
    dto.changeReason = entry.changeReason;
    dto.changedBy = entry.changedBy;
    dto.createdAt = entry.createdAt;
    return dto;
  }
}

export class BusinessEntityLinkResponseDto {
  id!: string;
  businessId!: string;
  entityType!: string;
  entityId!: string;
  isShared!: boolean;
  isPrimary!: boolean;
  createdAt!: Date;

  static from(link: IBusinessEntityLink): BusinessEntityLinkResponseDto {
    const dto = new BusinessEntityLinkResponseDto();
    dto.id = link.id;
    dto.businessId = link.businessId;
    dto.entityType = link.entityType;
    dto.entityId = link.entityId;
    dto.isShared = link.isShared;
    dto.isPrimary = link.isPrimary;
    dto.createdAt = link.createdAt;
    return dto;
  }
}
