import { IsArray, IsBoolean, IsInt, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { FBAShipmentType, FBAShipmentPrepType, FBAShipmentLabelType, FBAShipmentCarrierType } from '../interfaces';

export class AddFBAShipmentItemDto {
  @IsString()
  inventoryItemId!: string;

  @IsString()
  sku!: string;

  @IsOptional()
  @IsString()
  fnsku?: string;

  @IsOptional()
  @IsString()
  asin?: string;

  @IsOptional()
  @IsString()
  productName?: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsOptional()
  @IsString()
  batchNumber?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsString()
  externalProductId?: string;

  @IsOptional()
  @IsString()
  externalListingId?: string;

  @IsOptional()
  @IsString()
  prepType?: FBAShipmentPrepType;

  @IsOptional()
  @IsBoolean()
  prepRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  labelRequired?: boolean;

  @IsInt()
  requestedQuantity!: number;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @IsString()
  conditionNote?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateFBAShipmentDto {
  @IsString()
  shipmentType!: FBAShipmentType;

  @IsString()
  marketplaceAccountId!: string;

  @IsString()
  warehouseId!: string;

  @IsOptional()
  @IsString()
  externalShipmentId?: string;

  @IsOptional()
  @IsString()
  externalShipmentName?: string;

  @IsOptional()
  @IsString()
  externalPlanId?: string;

  @IsOptional()
  @IsString()
  destinationFCId?: string;

  @IsOptional()
  @IsString()
  destinationFCName?: string;

  @IsOptional()
  @IsObject()
  destinationAddress?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  labelType?: FBAShipmentLabelType;

  @IsOptional()
  @IsString()
  carrierType?: FBAShipmentCarrierType;

  @IsOptional()
  @IsString()
  carrierName?: string;

  @IsOptional()
  @IsString()
  carrierId?: string;

  @IsOptional()
  @IsString()
  serviceType?: string;

  @IsOptional()
  @IsBoolean()
  isCasePacked?: boolean;

  @IsOptional()
  @IsObject()
  prepInstructions?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddFBAShipmentItemDto)
  items?: AddFBAShipmentItemDto[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class BuildShipmentFromInventoryDto {
  @IsString()
  marketplaceAccountId!: string;

  @IsString()
  warehouseId!: string;

  @IsString()
  shipmentType!: FBAShipmentType;

  @IsArray()
  @IsString({ each: true })
  inventoryItemIds!: string[];

  @IsOptional()
  @IsString()
  destinationFCId?: string;

  @IsOptional()
  @IsBoolean()
  isCasePacked?: boolean;

  @IsOptional()
  @IsObject()
  prepInstructions?: Record<string, unknown>;
}
