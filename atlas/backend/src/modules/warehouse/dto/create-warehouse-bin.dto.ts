import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { BinType, BinMode, StorageCondition } from '../interfaces';

export class CreateWarehouseBinDto {
  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(BinType)
  type?: BinType;

  @IsOptional()
  @IsEnum(BinMode)
  mode?: BinMode;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  zoneId?: string;

  @IsOptional()
  @IsString()
  zone?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  capacity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weightLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dimensionLength?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dimensionWidth?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dimensionHeight?: number;

  @IsOptional()
  @IsString()
  dimensionUnit?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedProductIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedCategoryIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedStatuses?: string[];

  @IsOptional()
  @IsBoolean()
  allowBatch?: boolean;

  @IsOptional()
  @IsBoolean()
  allowSerial?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(StorageCondition, { each: true })
  storageConditions?: StorageCondition[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
