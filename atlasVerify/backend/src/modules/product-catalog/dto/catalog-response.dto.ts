import { CatalogStatus, ProductType } from '../interfaces';

export class CatalogHistoryResponseDto {
  id!: string;
  catalogId!: string;
  workspaceId!: string;
  fromStatus!: CatalogStatus;
  toStatus!: CatalogStatus;
  version!: number;
  reason?: string | null;
  changedBy?: string | null;
  snapshot?: unknown;
  createdAt!: Date;

  static from(raw: Record<string, unknown>): CatalogHistoryResponseDto {
    const dto = new CatalogHistoryResponseDto();
    dto.id = raw['id'] as string;
    dto.catalogId = raw['catalogId'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.fromStatus = raw['fromStatus'] as CatalogStatus;
    dto.toStatus = raw['toStatus'] as CatalogStatus;
    dto.version = raw['version'] as number;
    dto.reason = (raw['reason'] as string | null) ?? null;
    dto.changedBy = (raw['changedBy'] as string | null) ?? null;
    dto.snapshot = raw['snapshot'] ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    return dto;
  }
}

export class CatalogProductResponseDto {
  id!: string;
  workspaceId!: string;
  catalogSku!: string;
  skuSequence!: number;
  version!: number;
  status!: CatalogStatus;
  productName!: string;
  brand?: string | null;
  categoryId?: string | null;
  productType!: ProductType;
  description?: string | null;
  shortDescription?: string | null;
  procurementId?: string | null;
  qualityInspectionId?: string | null;
  supplierId?: string | null;
  countryOfOrigin?: string | null;
  hsCode?: string | null;
  specifications!: unknown[];
  attributes!: unknown[];
  variants!: unknown[];
  images!: unknown[];
  documents!: unknown[];
  purchaseCost?: number | null;
  landedCost?: number | null;
  suggestedSellingPrice?: number | null;
  currency?: string | null;
  dimensions?: unknown | null;
  weight?: unknown | null;
  packagingDetails?: unknown | null;
  duplicateOfId?: string | null;
  isDuplicate!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): CatalogProductResponseDto {
    const dto = new CatalogProductResponseDto();
    dto.id = raw['id'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.catalogSku = raw['catalogSku'] as string;
    dto.skuSequence = raw['skuSequence'] as number;
    dto.version = raw['version'] as number;
    dto.status = raw['status'] as CatalogStatus;
    dto.productName = raw['productName'] as string;
    dto.brand = (raw['brand'] as string | null) ?? null;
    dto.categoryId = (raw['categoryId'] as string | null) ?? null;
    dto.productType = raw['productType'] as ProductType;
    dto.description = (raw['description'] as string | null) ?? null;
    dto.shortDescription = (raw['shortDescription'] as string | null) ?? null;
    dto.procurementId = (raw['procurementId'] as string | null) ?? null;
    dto.qualityInspectionId = (raw['qualityInspectionId'] as string | null) ?? null;
    dto.supplierId = (raw['supplierId'] as string | null) ?? null;
    dto.countryOfOrigin = (raw['countryOfOrigin'] as string | null) ?? null;
    dto.hsCode = (raw['hsCode'] as string | null) ?? null;
    dto.specifications = (raw['specifications'] as unknown[]) ?? [];
    dto.attributes = (raw['attributes'] as unknown[]) ?? [];
    dto.variants = (raw['variants'] as unknown[]) ?? [];
    dto.images = (raw['images'] as unknown[]) ?? [];
    dto.documents = (raw['documents'] as unknown[]) ?? [];
    dto.purchaseCost = (raw['purchaseCost'] as number | null) ?? null;
    dto.landedCost = (raw['landedCost'] as number | null) ?? null;
    dto.suggestedSellingPrice = (raw['suggestedSellingPrice'] as number | null) ?? null;
    dto.currency = (raw['currency'] as string | null) ?? null;
    dto.dimensions = raw['dimensions'] ?? null;
    dto.weight = raw['weight'] ?? null;
    dto.packagingDetails = raw['packagingDetails'] ?? null;
    dto.duplicateOfId = (raw['duplicateOfId'] as string | null) ?? null;
    dto.isDuplicate = (raw['isDuplicate'] as boolean) ?? false;
    dto.createdAt = raw['createdAt'] as Date;
    dto.updatedAt = raw['updatedAt'] as Date;
    return dto;
  }
}

export class CatalogProductListResponseDto {
  data!: CatalogProductResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): CatalogProductListResponseDto {
    const dto = new CatalogProductListResponseDto();
    dto.data = items.map(CatalogProductResponseDto.from);
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}

export class CatalogStatsDto {
  total!: number;
  byStatus!: Record<string, number>;
  byProductType!: Record<string, number>;
  duplicates!: number;
}
