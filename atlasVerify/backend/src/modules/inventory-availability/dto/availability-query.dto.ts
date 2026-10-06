import { IsArray, IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class GetAvailabilityDto {
  @IsString()
  workspaceId!: string;

  @IsString()
  inventoryItemId!: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  binId?: string;

  @IsOptional()
  @IsString()
  batchId?: string;

  @IsOptional()
  @IsString()
  serialId?: string;

  @IsOptional()
  @IsString()
  marketplaceAccountId?: string;

  @IsOptional()
  @IsBoolean()
  includeIncoming?: boolean;

  @IsOptional()
  @IsBoolean()
  applyMarketplaceRules?: boolean;
}

export class GetBulkAvailabilityDto {
  @IsString()
  workspaceId!: string;

  @IsArray()
  @IsString({ each: true })
  inventoryItemIds!: string[];

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  marketplaceAccountId?: string;

  @IsOptional()
  @IsBoolean()
  includeIncoming?: boolean;

  @IsOptional()
  @IsBoolean()
  applyMarketplaceRules?: boolean;
}

export class GetAvailabilityBySkuDto {
  @IsString()
  workspaceId!: string;

  @IsString()
  sku!: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  marketplaceAccountId?: string;

  @IsOptional()
  @IsBoolean()
  includeIncoming?: boolean;

  @IsOptional()
  @IsBoolean()
  applyMarketplaceRules?: boolean;
}

export class GetAggregatedAvailabilityDto {
  @IsString()
  workspaceId!: string;

  @IsString()
  inventoryItemId!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  warehouseIds?: string[];

  @IsOptional()
  @IsString()
  marketplaceAccountId?: string;

  @IsOptional()
  @IsBoolean()
  includeIncoming?: boolean;

  @IsOptional()
  @IsBoolean()
  applyMarketplaceRules?: boolean;
}

export class GetFutureDateAvailabilityDto {
  @IsString()
  workspaceId!: string;

  @IsString()
  inventoryItemId!: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsDateString()
  futureDate!: string;

  @IsOptional()
  @IsString()
  marketplaceAccountId?: string;

  @IsOptional()
  @IsBoolean()
  applyMarketplaceRules?: boolean;
}

export class FilteredAvailabilityDto {
  @IsString()
  workspaceId!: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  batchId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsBoolean()
  lowStockOnly?: boolean;

  @IsOptional()
  @IsBoolean()
  outOfStockOnly?: boolean;

  @IsOptional()
  @IsString()
  search?: string;
}
