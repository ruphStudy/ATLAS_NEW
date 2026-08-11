import { IsArray, IsEnum, IsInt, IsObject, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PutawayStrategy } from '../interfaces';

export class CreatePutawayLineDto {
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
  batchNumber?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsString()
  sourceLocationId?: string;

  @IsOptional()
  @IsString()
  sourceBinId?: string;

  @IsOptional()
  @IsString()
  recommendedZoneId?: string;

  @IsOptional()
  @IsString()
  recommendedLocationId?: string;

  @IsOptional()
  @IsString()
  recommendedBinId?: string;

  @Min(0)
  quantity!: number;

  @IsOptional()
  @IsString()
  uom?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreatePutawayDto {
  @IsEnum(PutawayStrategy)
  strategy!: PutawayStrategy;

  @IsString()
  warehouseId!: string;

  @IsOptional()
  @IsString()
  receivingId?: string;

  @IsOptional()
  @IsString()
  sourceType?: string;

  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePutawayLineDto)
  lines?: CreatePutawayLineDto[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class GeneratePutawayFromReceivingDto {
  @IsString()
  receivingId!: string;

  @IsEnum(PutawayStrategy)
  strategy!: PutawayStrategy;

  @IsOptional()
  @IsInt()
  priority?: number;
}
