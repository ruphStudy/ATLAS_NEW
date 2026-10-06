import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsArray,
  Min,
} from 'class-validator';
import {
  WarehouseSyncType,
  WarehouseSyncDirection,
  WarehouseSyncConflictStrategy,
} from '../interfaces';

export class CreateWarehouseSyncConfigurationDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  sourceWarehouseId!: string;

  @IsString()
  targetWarehouseId!: string;

  @IsEnum(WarehouseSyncType)
  @IsOptional()
  syncType?: WarehouseSyncType;

  @IsEnum(WarehouseSyncDirection)
  @IsOptional()
  syncDirection?: WarehouseSyncDirection;

  @IsEnum(WarehouseSyncConflictStrategy)
  @IsOptional()
  conflictStrategy?: WarehouseSyncConflictStrategy;

  @IsBoolean()
  @IsOptional()
  syncAvailable?: boolean;

  @IsBoolean()
  @IsOptional()
  syncReserved?: boolean;

  @IsBoolean()
  @IsOptional()
  syncAllocated?: boolean;

  @IsBoolean()
  @IsOptional()
  syncBlocked?: boolean;

  @IsBoolean()
  @IsOptional()
  syncDamaged?: boolean;

  @IsBoolean()
  @IsOptional()
  syncInTransit?: boolean;

  @IsBoolean()
  @IsOptional()
  syncIncoming?: boolean;

  @IsBoolean()
  @IsOptional()
  scheduleEnabled?: boolean;

  @IsOptional()
  @IsString()
  scheduleCron?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  batchSize?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  maxRetries?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  retryDelaySeconds?: number;

  @IsOptional()
  @IsString()
  filterByRegion?: string;

  @IsOptional()
  @IsString()
  filterByChannel?: string;

  @IsOptional()
  @IsString()
  filterByMarketplaceAccountId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  filterBySku?: string[];

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsInt()
  @IsOptional()
  priority?: number;

  @IsBoolean()
  @IsOptional()
  recalculateAvailability?: boolean;
}

export class UpdateWarehouseSyncConfigurationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(WarehouseSyncType)
  @IsOptional()
  syncType?: WarehouseSyncType;

  @IsEnum(WarehouseSyncDirection)
  @IsOptional()
  syncDirection?: WarehouseSyncDirection;

  @IsEnum(WarehouseSyncConflictStrategy)
  @IsOptional()
  conflictStrategy?: WarehouseSyncConflictStrategy;

  @IsBoolean()
  @IsOptional()
  syncAvailable?: boolean;

  @IsBoolean()
  @IsOptional()
  syncReserved?: boolean;

  @IsBoolean()
  @IsOptional()
  syncAllocated?: boolean;

  @IsBoolean()
  @IsOptional()
  syncBlocked?: boolean;

  @IsBoolean()
  @IsOptional()
  syncDamaged?: boolean;

  @IsBoolean()
  @IsOptional()
  syncInTransit?: boolean;

  @IsBoolean()
  @IsOptional()
  syncIncoming?: boolean;

  @IsBoolean()
  @IsOptional()
  scheduleEnabled?: boolean;

  @IsOptional()
  @IsString()
  scheduleCron?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  batchSize?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  maxRetries?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  retryDelaySeconds?: number;

  @IsOptional()
  @IsString()
  filterByRegion?: string;

  @IsOptional()
  @IsString()
  filterByChannel?: string;

  @IsOptional()
  @IsString()
  filterByMarketplaceAccountId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  filterBySku?: string[];

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsInt()
  @IsOptional()
  priority?: number;

  @IsBoolean()
  @IsOptional()
  recalculateAvailability?: boolean;
}
