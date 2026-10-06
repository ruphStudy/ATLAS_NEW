import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';
import { WarehouseSyncStatus, WarehouseSyncType } from '../interfaces';

export class WarehouseSyncConfigurationFilterDto {
  @IsString()
  workspaceId!: string;

  @IsOptional()
  @IsString()
  sourceWarehouseId?: string;

  @IsOptional()
  @IsString()
  targetWarehouseId?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}

export class WarehouseSyncJobFilterDto {
  @IsString()
  workspaceId!: string;

  @IsOptional()
  @IsString()
  configurationId?: string;

  @IsOptional()
  @IsEnum(WarehouseSyncStatus)
  status?: WarehouseSyncStatus;

  @IsOptional()
  @IsEnum(WarehouseSyncType)
  syncType?: WarehouseSyncType;

  @IsOptional()
  @IsString()
  sourceWarehouseId?: string;

  @IsOptional()
  @IsString()
  targetWarehouseId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}

export class WarehouseSyncConflictFilterDto {
  @IsString()
  workspaceId!: string;

  @IsOptional()
  @IsString()
  syncJobId?: string;

  @IsOptional()
  @IsString()
  inventoryItemId?: string;

  @IsOptional()
  @IsBoolean()
  resolved?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
