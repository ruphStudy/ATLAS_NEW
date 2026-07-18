import { IPricingConfig, IPricingRecord, PricingCalculationResult, PricingStrategy, PricingStatus } from '../interfaces';

export class PricingConfigResponseDto {
  id!: string;
  workspaceId!: string;
  marketplaceKey!: string;
  country!: string;
  currency!: string;
  strategy!: PricingStrategy;
  isDefault!: boolean;
  isActive!: boolean;
  feeComponents!: Record<string, unknown>;
  thresholds!: Record<string, unknown>;
  rules?: Record<string, unknown> | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): PricingConfigResponseDto {
    const dto = new PricingConfigResponseDto();
    dto.id = raw['id'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.marketplaceKey = raw['marketplaceKey'] as string;
    dto.country = raw['country'] as string;
    dto.currency = raw['currency'] as string;
    dto.strategy = raw['strategy'] as PricingStrategy;
    dto.isDefault = raw['isDefault'] as boolean;
    dto.isActive = raw['isActive'] as boolean;
    dto.feeComponents = (raw['feeComponents'] as Record<string, unknown>) ?? {};
    dto.thresholds = (raw['thresholds'] as Record<string, unknown>) ?? {};
    dto.rules = (raw['rules'] as Record<string, unknown> | null) ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    dto.updatedAt = raw['updatedAt'] as Date;
    return dto;
  }
}

export class PricingRecordResponseDto {
  id!: string;
  workspaceId!: string;
  catalogProductId!: string;
  configId?: string | null;
  marketplaceKey!: string;
  country!: string;
  currency!: string;
  strategy!: PricingStrategy;
  status!: PricingStatus;
  version!: number;
  baseCost?: number | null;
  landedCost?: number | null;
  procurementCost?: number | null;
  totalCost?: number | null;
  suggestedSellingPrice?: number | null;
  marketplaceSellingPrice?: number | null;
  compareAtPrice?: number | null;
  estimatedProfit?: number | null;
  estimatedMarginPct?: number | null;
  estimatedRoi?: number | null;
  manualOverridePrice?: number | null;
  scheduledPrice?: number | null;
  scheduledAt?: Date | null;
  isValid!: boolean;
  validationErrors?: string[] | null;
  calculationMeta?: Record<string, unknown> | null;
  errorMessage?: string | null;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): PricingRecordResponseDto {
    const dto = new PricingRecordResponseDto();
    dto.id = raw['id'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.catalogProductId = raw['catalogProductId'] as string;
    dto.configId = (raw['configId'] as string | null) ?? null;
    dto.marketplaceKey = raw['marketplaceKey'] as string;
    dto.country = (raw['country'] as string) ?? 'GLOBAL';
    dto.currency = (raw['currency'] as string) ?? 'USD';
    dto.strategy = raw['strategy'] as PricingStrategy;
    dto.status = raw['status'] as PricingStatus;
    dto.version = raw['version'] as number;
    dto.baseCost = (raw['baseCost'] as number | null) ?? null;
    dto.landedCost = (raw['landedCost'] as number | null) ?? null;
    dto.procurementCost = (raw['procurementCost'] as number | null) ?? null;
    dto.totalCost = (raw['totalCost'] as number | null) ?? null;
    dto.suggestedSellingPrice = (raw['suggestedSellingPrice'] as number | null) ?? null;
    dto.marketplaceSellingPrice = (raw['marketplaceSellingPrice'] as number | null) ?? null;
    dto.compareAtPrice = (raw['compareAtPrice'] as number | null) ?? null;
    dto.estimatedProfit = (raw['estimatedProfit'] as number | null) ?? null;
    dto.estimatedMarginPct = (raw['estimatedMarginPct'] as number | null) ?? null;
    dto.estimatedRoi = (raw['estimatedRoi'] as number | null) ?? null;
    dto.manualOverridePrice = (raw['manualOverridePrice'] as number | null) ?? null;
    dto.scheduledPrice = (raw['scheduledPrice'] as number | null) ?? null;
    dto.scheduledAt = (raw['scheduledAt'] as Date | null) ?? null;
    dto.isValid = (raw['isValid'] as boolean) ?? false;
    dto.validationErrors = (raw['validationErrors'] as string[] | null) ?? null;
    dto.calculationMeta = (raw['calculationMeta'] as Record<string, unknown> | null) ?? null;
    dto.errorMessage = (raw['errorMessage'] as string | null) ?? null;
    dto.approvedBy = (raw['approvedBy'] as string | null) ?? null;
    dto.approvedAt = (raw['approvedAt'] as Date | null) ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    dto.updatedAt = raw['updatedAt'] as Date;
    return dto;
  }
}

export class PricingCalculationResponseDto {
  pricingRecordId?: string;
  totalCost!: number;
  suggestedSellingPrice!: number;
  marketplaceSellingPrice!: number;
  compareAtPrice?: number | null;
  estimatedProfit!: number;
  estimatedMarginPct!: number;
  estimatedRoi!: number;
  breakdown!: unknown[];
  warnings!: string[];
  isValid!: boolean;
  validationErrors!: string[];

  static from(result: PricingCalculationResult, recordId?: string): PricingCalculationResponseDto {
    const dto = new PricingCalculationResponseDto();
    if (recordId) dto.pricingRecordId = recordId;
    dto.totalCost = result.totalCost;
    dto.suggestedSellingPrice = result.suggestedSellingPrice;
    dto.marketplaceSellingPrice = result.marketplaceSellingPrice;
    dto.compareAtPrice = result.compareAtPrice ?? null;
    dto.estimatedProfit = result.estimatedProfit;
    dto.estimatedMarginPct = result.estimatedMarginPct;
    dto.estimatedRoi = result.estimatedRoi;
    dto.breakdown = result.breakdown;
    dto.warnings = result.warnings;
    dto.isValid = result.isValid;
    dto.validationErrors = result.validationErrors;
    return dto;
  }
}

export class PricingListResponseDto {
  data!: PricingRecordResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): PricingListResponseDto {
    const dto = new PricingListResponseDto();
    dto.data = items.map(PricingRecordResponseDto.from);
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}

export class PricingComparisonResponseDto {
  comparisons!: unknown[];
  bestValue?: unknown;
}
