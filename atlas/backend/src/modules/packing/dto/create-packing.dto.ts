import { IsArray, IsEnum, IsInt, IsNumber, IsObject, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PackingType, PackageType } from '../interfaces';

export class CreatePackingLineDto {
  @IsOptional()
  @IsString()
  pickingLineId?: string;

  @IsOptional()
  @IsString()
  inventoryItemId?: string;

  @IsOptional()
  @IsString()
  sku?: string;

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

  @IsNumber()
  @Min(0)
  pickedQuantity!: number;

  @IsOptional()
  @IsString()
  uom?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreatePackingDto {
  @IsEnum(PackingType)
  packingType!: PackingType;

  @IsString()
  warehouseId!: string;

  @IsOptional()
  @IsString()
  pickingTaskId?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  shipmentId?: string;

  @IsOptional()
  @IsString()
  sourceType?: string;

  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsOptional()
  @IsString()
  dispatchLocationId?: string;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePackingLineDto)
  lines?: CreatePackingLineDto[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class GeneratePackingFromPickingDto {
  @IsString()
  pickingTaskId!: string;

  @IsEnum(PackingType)
  packingType!: PackingType;

  @IsOptional()
  @IsString()
  dispatchLocationId?: string;

  @IsOptional()
  @IsInt()
  priority?: number;
}

export class CreatePackageDto {
  @IsEnum(PackageType)
  packageType!: PackageType;

  @IsOptional()
  @IsNumber()
  length?: number;

  @IsOptional()
  @IsNumber()
  width?: number;

  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsString()
  dimensionUnit?: string;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsString()
  weightUnit?: string;

  @IsOptional()
  @IsNumber()
  maxWeight?: number;

  @IsOptional()
  @IsArray()
  contents?: unknown[];

  @IsOptional()
  @IsArray()
  packingMaterial?: unknown[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
