import {
  IMarketplaceSchema,
  ICategoryMapping,
  IAttributeMapping,
  IMarketplaceMappingConfig,
  IMarketplaceMappingVersionHistory,
  TransformationResult,
  MarketplaceValidationResult,
} from '../interfaces';

// ── Schema ────────────────────────────────────────────────────

export class MarketplaceSchemaResponseDto {
  id!: string;
  workspaceId?: string | null;
  marketplaceKey!: string;
  country!: string;
  region?: string | null;
  locale!: string;
  currency!: string;
  category?: string | null;
  schemaVersion!: string;
  status!: string;
  isDefault!: boolean;
  requiredFields!: unknown[];
  optionalFields!: unknown[];
  mediaRequirements!: unknown;
  variantRules!: unknown;
  contentRules!: unknown;
  pricingRequirements!: unknown;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  createdBy?: string | null;
  approvedBy?: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): MarketplaceSchemaResponseDto {
    const dto = new MarketplaceSchemaResponseDto();
    dto.id = raw['id'] as string;
    dto.workspaceId = (raw['workspaceId'] as string | null) ?? null;
    dto.marketplaceKey = raw['marketplaceKey'] as string;
    dto.country = raw['country'] as string;
    dto.region = (raw['region'] as string | null) ?? null;
    dto.locale = raw['locale'] as string;
    dto.currency = raw['currency'] as string;
    dto.category = (raw['category'] as string | null) ?? null;
    dto.schemaVersion = raw['schemaVersion'] as string;
    dto.status = raw['status'] as string;
    dto.isDefault = raw['isDefault'] as boolean;
    dto.requiredFields = (raw['requiredFields'] as unknown[]) ?? [];
    dto.optionalFields = (raw['optionalFields'] as unknown[]) ?? [];
    dto.mediaRequirements = raw['mediaRequirements'] ?? {};
    dto.variantRules = raw['variantRules'] ?? {};
    dto.contentRules = raw['contentRules'] ?? {};
    dto.pricingRequirements = raw['pricingRequirements'] ?? {};
    dto.effectiveFrom = (raw['effectiveFrom'] as Date | null) ?? null;
    dto.effectiveTo = (raw['effectiveTo'] as Date | null) ?? null;
    dto.createdBy = (raw['createdBy'] as string | null) ?? null;
    dto.approvedBy = (raw['approvedBy'] as string | null) ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    dto.updatedAt = raw['updatedAt'] as Date;
    return dto;
  }
}

// ── Category Mapping ──────────────────────────────────────────

export class CategoryMappingResponseDto {
  id!: string;
  workspaceId?: string | null;
  universalCategory!: string;
  marketplaceKey!: string;
  country!: string;
  marketplaceCategory!: string;
  marketplaceCategoryId?: string | null;
  categoryPath?: string | null;
  confidence!: number;
  status!: string;
  isManualOverride!: boolean;
  version!: number;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): CategoryMappingResponseDto {
    const dto = new CategoryMappingResponseDto();
    dto.id = raw['id'] as string;
    dto.workspaceId = (raw['workspaceId'] as string | null) ?? null;
    dto.universalCategory = raw['universalCategory'] as string;
    dto.marketplaceKey = raw['marketplaceKey'] as string;
    dto.country = raw['country'] as string;
    dto.marketplaceCategory = raw['marketplaceCategory'] as string;
    dto.marketplaceCategoryId = (raw['marketplaceCategoryId'] as string | null) ?? null;
    dto.categoryPath = (raw['categoryPath'] as string | null) ?? null;
    dto.confidence = raw['confidence'] as number;
    dto.status = raw['status'] as string;
    dto.isManualOverride = raw['isManualOverride'] as boolean;
    dto.version = raw['version'] as number;
    dto.createdAt = raw['createdAt'] as Date;
    dto.updatedAt = raw['updatedAt'] as Date;
    return dto;
  }
}

// ── Attribute Mapping ─────────────────────────────────────────

export class AttributeMappingResponseDto {
  id!: string;
  workspaceId?: string | null;
  marketplaceKey!: string;
  country!: string;
  universalAttribute!: string;
  marketplaceAttribute!: string;
  transformType!: string;
  valueMapping?: unknown;
  unitConversion?: unknown;
  defaultValue?: unknown;
  isRequired!: boolean;
  isManualOverride!: boolean;
  version!: number;
  status!: string;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): AttributeMappingResponseDto {
    const dto = new AttributeMappingResponseDto();
    dto.id = raw['id'] as string;
    dto.workspaceId = (raw['workspaceId'] as string | null) ?? null;
    dto.marketplaceKey = raw['marketplaceKey'] as string;
    dto.country = raw['country'] as string;
    dto.universalAttribute = raw['universalAttribute'] as string;
    dto.marketplaceAttribute = raw['marketplaceAttribute'] as string;
    dto.transformType = raw['transformType'] as string;
    dto.valueMapping = raw['valueMapping'] ?? null;
    dto.unitConversion = raw['unitConversion'] ?? null;
    dto.defaultValue = raw['defaultValue'] ?? null;
    dto.isRequired = raw['isRequired'] as boolean;
    dto.isManualOverride = raw['isManualOverride'] as boolean;
    dto.version = raw['version'] as number;
    dto.status = raw['status'] as string;
    dto.createdAt = raw['createdAt'] as Date;
    dto.updatedAt = raw['updatedAt'] as Date;
    return dto;
  }
}

// ── Mapping Config ────────────────────────────────────────────

export class MappingConfigResponseDto {
  id!: string;
  workspaceId!: string;
  marketplaceKey!: string;
  country!: string;
  category?: string | null;
  schemaVersion!: string;
  status!: string;
  mappingVersion!: number;
  isDefault!: boolean;
  overrides?: unknown;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  publishedAt?: Date | null;
  publishedBy?: string | null;
  approvedBy?: string | null;
  createdBy?: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): MappingConfigResponseDto {
    const dto = new MappingConfigResponseDto();
    dto.id = raw['id'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.marketplaceKey = raw['marketplaceKey'] as string;
    dto.country = raw['country'] as string;
    dto.category = (raw['category'] as string | null) ?? null;
    dto.schemaVersion = raw['schemaVersion'] as string;
    dto.status = raw['status'] as string;
    dto.mappingVersion = raw['mappingVersion'] as number;
    dto.isDefault = raw['isDefault'] as boolean;
    dto.overrides = raw['overrides'] ?? null;
    dto.effectiveFrom = (raw['effectiveFrom'] as Date | null) ?? null;
    dto.effectiveTo = (raw['effectiveTo'] as Date | null) ?? null;
    dto.publishedAt = (raw['publishedAt'] as Date | null) ?? null;
    dto.publishedBy = (raw['publishedBy'] as string | null) ?? null;
    dto.approvedBy = (raw['approvedBy'] as string | null) ?? null;
    dto.createdBy = (raw['createdBy'] as string | null) ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    dto.updatedAt = raw['updatedAt'] as Date;
    return dto;
  }
}

// ── Pagination ────────────────────────────────────────────────

export class PaginatedResponseDto<T> {
  data!: T[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static of<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResponseDto<T> {
    const dto = new PaginatedResponseDto<T>();
    dto.data = data;
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}

// ── Transformation Job ────────────────────────────────────────

export class TransformationJobResponseDto {
  id!: string;
  workspaceId!: string;
  listingId!: string;
  catalogProductId!: string;
  marketplaceKey!: string;
  country!: string;
  schemaVersion!: string;
  status!: string;
  isDryRun!: boolean;
  payload?: unknown;
  fieldTrace?: unknown;
  warnings?: unknown;
  errors?: unknown;
  startedAt?: Date | null;
  completedAt?: Date | null;
  failedAt?: Date | null;
  errorMessage?: string | null;
  retryCount!: number;
  triggeredBy?: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): TransformationJobResponseDto {
    const dto = new TransformationJobResponseDto();
    dto.id = raw['id'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.listingId = raw['listingId'] as string;
    dto.catalogProductId = raw['catalogProductId'] as string;
    dto.marketplaceKey = raw['marketplaceKey'] as string;
    dto.country = raw['country'] as string;
    dto.schemaVersion = raw['schemaVersion'] as string;
    dto.status = raw['status'] as string;
    dto.isDryRun = raw['isDryRun'] as boolean;
    dto.payload = raw['payload'] ?? null;
    dto.fieldTrace = raw['fieldTrace'] ?? null;
    dto.warnings = raw['warnings'] ?? null;
    dto.errors = raw['errors'] ?? null;
    dto.startedAt = (raw['startedAt'] as Date | null) ?? null;
    dto.completedAt = (raw['completedAt'] as Date | null) ?? null;
    dto.failedAt = (raw['failedAt'] as Date | null) ?? null;
    dto.errorMessage = (raw['errorMessage'] as string | null) ?? null;
    dto.retryCount = (raw['retryCount'] as number) ?? 0;
    dto.triggeredBy = (raw['triggeredBy'] as string | null) ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    dto.updatedAt = raw['updatedAt'] as Date;
    return dto;
  }
}
