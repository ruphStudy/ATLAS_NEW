import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ZoneType, StorageCondition } from '../interfaces';

export class CreateWarehouseZoneDto {
  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(ZoneType)
  type?: ZoneType;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  capacity?: number;

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
  @IsArray()
  @IsString({ each: true })
  handlingRequirements?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
