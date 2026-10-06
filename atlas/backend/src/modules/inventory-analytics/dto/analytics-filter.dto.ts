import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  IsArray,
} from 'class-validator';
import { InventoryAnalyticsPeriod } from '../interfaces';

export class InventoryAnalyticsFilterDto {
  @IsString()
  workspaceId!: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  inventoryItemId?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  catalogProductId?: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsOptional()
  @IsString()
  marketplaceAccountId?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsEnum(InventoryAnalyticsPeriod)
  period?: InventoryAnalyticsPeriod;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}

export class DashboardFilterDto {
  @IsString()
  workspaceId!: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  marketplaceAccountId?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metrics?: string[];
}

export class TrendFilterDto {
  @IsString()
  workspaceId!: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsString()
  metric!: string;

  @IsEnum(InventoryAnalyticsPeriod)
  period!: InventoryAnalyticsPeriod;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class ProductAnalyticsFilterDto {
  @IsString()
  workspaceId!: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}

export class WarehouseBreakdownFilterDto {
  @IsString()
  workspaceId!: string;

  @IsOptional()
  @IsString()
  marketplaceAccountId?: string;

  @IsOptional()
  @IsString()
  region?: string;
}

export class RefreshCacheDto {
  @IsString()
  workspaceId!: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cacheKeys?: string[];
}
