import { IsArray, IsInt, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DispatchType } from '../interfaces';

export class AddDispatchPackageDto {
  @IsString()
  packageId!: string;

  @IsOptional()
  @IsString()
  packingPackageId?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  shipmentId?: string;

  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateDispatchDto {
  @IsString()
  dispatchType!: DispatchType;

  @IsString()
  warehouseId!: string;

  @IsOptional()
  @IsString()
  packingTaskId?: string;

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
  carrierId?: string;

  @IsOptional()
  @IsString()
  carrierName?: string;

  @IsOptional()
  @IsString()
  serviceType?: string;

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
  @Type(() => AddDispatchPackageDto)
  packages?: AddDispatchPackageDto[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class GenerateDispatchFromPackingDto {
  @IsString()
  packingTaskId!: string;

  @IsString()
  dispatchType!: DispatchType;

  @IsOptional()
  @IsString()
  carrierId?: string;

  @IsOptional()
  @IsString()
  carrierName?: string;

  @IsOptional()
  @IsString()
  serviceType?: string;

  @IsOptional()
  @IsString()
  dispatchLocationId?: string;

  @IsOptional()
  @IsInt()
  priority?: number;
}
