import {
  CapabilityCategory,
  CapabilityDependency,
  CapabilityOverrideType,
  CapabilityStatus,
  CapabilitySupportLevel,
  IMarketplaceCapabilityDefinition,
  IMarketplaceProviderCapabilityDeclaration,
} from '../interfaces';

// ── Create / Update Capability ───────────────────────────────

export class CreateCapabilityDto {
  capabilityKey!: string;
  name!: string;
  description?: string;
  category!: CapabilityCategory;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  supportedOperations?: string[];
  requiredPermissions?: string[];
  requiredConfiguration?: Record<string, unknown>;
  requiredCredentials?: string[];
  requiredProviderVersion?: string;
  requiredApiVersion?: string;
  countryRestrictions?: string[];
  regionRestrictions?: string[];
  marketplaceRestrictions?: string[];
  featureFlags?: Record<string, unknown>;
  dependencies?: CapabilityDependency[];
  metadata?: Record<string, unknown>;
}

export class UpdateCapabilityDto {
  name?: string;
  description?: string;
  category?: CapabilityCategory;
  inputSchema?: Record<string, unknown> | null;
  outputSchema?: Record<string, unknown> | null;
  supportedOperations?: string[];
  requiredPermissions?: string[];
  requiredConfiguration?: Record<string, unknown>;
  requiredCredentials?: string[];
  requiredProviderVersion?: string | null;
  requiredApiVersion?: string | null;
  countryRestrictions?: string[];
  regionRestrictions?: string[];
  marketplaceRestrictions?: string[];
  featureFlags?: Record<string, unknown>;
  dependencies?: CapabilityDependency[];
  metadata?: Record<string, unknown>;
  changeReason?: string;
}

// ── Provider Declaration ──────────────────────────────────────

export class DeclareProviderCapabilityDto {
  providerKey!: string;
  capabilityKey!: string;
  workspaceId?: string | null;
  marketplaceKey?: string | null;
  accountId?: string | null;
  supportLevel!: CapabilitySupportLevel;
  supportedOperations?: string[];
  countryAvailability?: string[];
  regionAvailability?: string[];
  marketplaceAvailability?: string[];
  accountAvailability?: string[];
  limitations?: Record<string, unknown>;
  rateLimits?: Record<string, unknown>;
  batchLimits?: Record<string, unknown>;
  featureRestrictions?: Record<string, unknown>;
  providerMetadata?: Record<string, unknown>;
  capabilityVersion?: string | null;
  providerVersion?: string | null;
  apiVersion?: string | null;
}

export class UpdateDeclarationDto {
  supportLevel?: CapabilitySupportLevel;
  supportedOperations?: string[];
  countryAvailability?: string[];
  regionAvailability?: string[];
  limitations?: Record<string, unknown>;
  rateLimits?: Record<string, unknown>;
  batchLimits?: Record<string, unknown>;
  featureRestrictions?: Record<string, unknown>;
  providerMetadata?: Record<string, unknown>;
  capabilityVersion?: string | null;
  providerVersion?: string | null;
  apiVersion?: string | null;
}

// ── Override ──────────────────────────────────────────────────

export class CreateCapabilityOverrideDto {
  capabilityKey!: string;
  workspaceId?: string | null;
  providerKey?: string | null;
  accountId?: string | null;
  marketplaceKey?: string | null;
  country?: string | null;
  region?: string | null;
  featureFlag?: string | null;
  overrideType!: CapabilityOverrideType;
  overrideValue!: Record<string, unknown>;
  priority?: number;
  reason?: string | null;
}

// ── Filters ───────────────────────────────────────────────────

export class CapabilityFilterDto {
  providerKey?: string;
  capabilityKey?: string;
  category?: CapabilityCategory;
  status?: CapabilityStatus;
  marketplaceKey?: string;
  accountId?: string;
  country?: string;
  region?: string;
  supportLevel?: CapabilitySupportLevel;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ── Capability Matrix ─────────────────────────────────────────

export class CapabilityMatrixQueryDto {
  workspaceId!: string;
  providerKey?: string;
  marketplaceKey?: string;
  accountId?: string;
  country?: string;
  region?: string;
  category?: CapabilityCategory;
  apiVersion?: string;
  providerVersion?: string;
}

// ── Response DTOs ─────────────────────────────────────────────

export class CapabilityResponseDto {
  id!: string;
  capabilityKey!: string;
  name!: string;
  description?: string | null;
  category!: CapabilityCategory;
  status!: string;
  version!: number;
  publishedVersion?: number | null;
  supportedOperations!: string[];
  requiredPermissions!: string[];
  requiredProviderVersion?: string | null;
  requiredApiVersion?: string | null;
  countryRestrictions!: string[];
  regionRestrictions!: string[];
  marketplaceRestrictions!: string[];
  dependencies!: CapabilityDependency[];
  createdAt!: Date;
  updatedAt!: Date;

  static from(definition: IMarketplaceCapabilityDefinition): CapabilityResponseDto {
    const dto = new CapabilityResponseDto();
    dto.id = definition.id;
    dto.capabilityKey = definition.capabilityKey;
    dto.name = definition.name;
    dto.description = definition.description;
    dto.category = definition.category;
    dto.status = definition.status;
    dto.version = definition.version;
    dto.publishedVersion = definition.publishedVersion;
    dto.supportedOperations = definition.supportedOperations;
    dto.requiredPermissions = definition.requiredPermissions;
    dto.requiredProviderVersion = definition.requiredProviderVersion;
    dto.requiredApiVersion = definition.requiredApiVersion;
    dto.countryRestrictions = definition.countryRestrictions;
    dto.regionRestrictions = definition.regionRestrictions;
    dto.marketplaceRestrictions = definition.marketplaceRestrictions;
    dto.dependencies = definition.dependencies;
    dto.createdAt = definition.createdAt;
    dto.updatedAt = definition.updatedAt;
    return dto;
  }
}

export class DeclarationResponseDto {
  id!: string;
  providerKey!: string;
  capabilityKey!: string;
  workspaceId?: string | null;
  accountId?: string | null;
  supportLevel!: CapabilitySupportLevel;
  supportedOperations!: string[];
  countryAvailability!: string[];
  regionAvailability!: string[];
  limitations!: Record<string, unknown>;
  rateLimits!: Record<string, unknown>;
  batchLimits!: Record<string, unknown>;
  capabilityVersion?: string | null;
  providerVersion?: string | null;
  apiVersion?: string | null;
  status!: string;
  createdAt!: Date;
  updatedAt!: Date;

  static from(declaration: IMarketplaceProviderCapabilityDeclaration): DeclarationResponseDto {
    const dto = new DeclarationResponseDto();
    dto.id = declaration.id;
    dto.providerKey = declaration.providerKey;
    dto.capabilityKey = declaration.capabilityKey;
    dto.workspaceId = declaration.workspaceId;
    dto.accountId = declaration.accountId;
    dto.supportLevel = declaration.supportLevel;
    dto.supportedOperations = declaration.supportedOperations;
    dto.countryAvailability = declaration.countryAvailability;
    dto.regionAvailability = declaration.regionAvailability;
    dto.limitations = declaration.limitations;
    dto.rateLimits = declaration.rateLimits;
    dto.batchLimits = declaration.batchLimits;
    dto.capabilityVersion = declaration.capabilityVersion;
    dto.providerVersion = declaration.providerVersion;
    dto.apiVersion = declaration.apiVersion;
    dto.status = declaration.status;
    dto.createdAt = declaration.createdAt;
    dto.updatedAt = declaration.updatedAt;
    return dto;
  }
}

export class PaginatedCapabilityResponseDto {
  items!: CapabilityResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}
