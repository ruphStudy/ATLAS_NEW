import { IsEnum, IsInt, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { WarehouseLocationType } from '../interfaces';

export class CreateWarehouseLocationDto {
  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(WarehouseLocationType)
  type?: WarehouseLocationType;

  @IsOptional()
  @IsString()
  parentLocationId?: string;

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
  @IsInt()
  @Min(0)
  capacity?: number;

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
  @IsObject()
  metadata?: Record<string, unknown>;
}
