import { IsBoolean, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { ReorderStrategy } from '../interfaces';

export class CreateReorderConfigurationDto {
  @IsString()
  inventoryItemId!: string;

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
  warehouseId?: string;

  @IsOptional()
  @IsString()
  marketplaceAccountId?: string;

  @IsOptional()
  @IsNumber()
  reorderPoint?: number;

  @IsOptional()
  @IsNumber()
  safetyStock?: number;

  @IsOptional()
  @IsNumber()
  minimumStock?: number;

  @IsOptional()
  @IsNumber()
  maximumStock?: number;

  @IsOptional()
  @IsInt()
  targetDaysOfCover?: number;

  @IsString()
  reorderStrategy!: ReorderStrategy;

  @IsOptional()
  @IsNumber()
  fixedReorderQuantity?: number;

  @IsOptional()
  @IsInt()
  leadTimeDays?: number;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  preferredSupplierId?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateReorderConfigurationDto {
  @IsOptional()
  @IsNumber()
  reorderPoint?: number;

  @IsOptional()
  @IsNumber()
  safetyStock?: number;

  @IsOptional()
  @IsNumber()
  minimumStock?: number;

  @IsOptional()
  @IsNumber()
  maximumStock?: number;

  @IsOptional()
  @IsInt()
  targetDaysOfCover?: number;

  @IsOptional()
  @IsString()
  reorderStrategy?: ReorderStrategy;

  @IsOptional()
  @IsNumber()
  fixedReorderQuantity?: number;

  @IsOptional()
  @IsInt()
  leadTimeDays?: number;

  @IsOptional()
  @IsString()
  preferredSupplierId?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
