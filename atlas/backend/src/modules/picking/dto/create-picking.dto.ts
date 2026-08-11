import { IsArray, IsDate, IsEnum, IsInt, IsNumber, IsObject, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PickingType, PickingStrategy } from '../interfaces';

export class CreatePickingLineDto {
  @IsOptional()
  @IsString()
  inventoryItemId?: string;

  @IsOptional()
  @IsString()
  allocationId?: string;

  @IsOptional()
  @IsString()
  reservationId?: string;

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

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiryDate?: Date;

  @IsOptional()
  @IsString()
  sourceZoneId?: string;

  @IsOptional()
  @IsString()
  sourceLocationId?: string;

  @IsOptional()
  @IsString()
  sourceBinId?: string;

  @IsNumber()
  @Min(0)
  requestedQuantity!: number;

  @IsOptional()
  @IsString()
  uom?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreatePickingDto {
  @IsEnum(PickingType)
  pickingType!: PickingType;

  @IsEnum(PickingStrategy)
  strategy!: PickingStrategy;

  @IsString()
  warehouseId!: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  transferId?: string;

  @IsOptional()
  @IsString()
  sourceType?: string;

  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsOptional()
  @IsString()
  stagingLocationId?: string;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsString()
  waveId?: string;

  @IsOptional()
  @IsString()
  batchId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePickingLineDto)
  lines?: CreatePickingLineDto[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class GeneratePickingFromOrderDto {
  @IsString()
  orderId!: string;

  @IsEnum(PickingType)
  pickingType!: PickingType;

  @IsEnum(PickingStrategy)
  strategy!: PickingStrategy;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  stagingLocationId?: string;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsString()
  waveId?: string;

  @IsOptional()
  @IsString()
  batchId?: string;
}

export class GeneratePickingFromTransferDto {
  @IsString()
  transferId!: string;

  @IsEnum(PickingType)
  pickingType!: PickingType;

  @IsEnum(PickingStrategy)
  strategy!: PickingStrategy;

  @IsOptional()
  @IsString()
  stagingLocationId?: string;

  @IsOptional()
  @IsInt()
  priority?: number;
}
