import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { InventoryTrackingType } from '../interfaces';

export class CreateInventoryItemDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  catalogProductId?: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsOptional()
  @IsEnum(InventoryTrackingType)
  trackingType?: InventoryTrackingType;

  @IsOptional()
  @IsString()
  baseUom?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  reorderPoint?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  safetyStock?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  reorderQuantity?: number;

  @IsOptional()
  @IsBoolean()
  isExpiryTracked?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  shelfLifeDays?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
