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
import { BinType, BinStatus, BinMode, StorageCondition } from '../interfaces';

export class UpdateWarehouseBinDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(BinType)
  type?: BinType;

  @IsOptional()
  @IsEnum(BinStatus)
  status?: BinStatus;

  @IsOptional()
  @IsEnum(BinMode)
  mode?: BinMode;

  @IsOptional()
  @IsString()
  locationId?: string | null;

  @IsOptional()
  @IsString()
  zoneId?: string | null;

  @IsOptional()
  @IsString()
  zone?: string | null;

  @IsOptional()
  @IsString()
  barcode?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  capacity?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weightLimit?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dimensionLength?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dimensionWidth?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dimensionHeight?: number | null;

  @IsOptional()
  @IsString()
  dimensionUnit?: string | null;

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
