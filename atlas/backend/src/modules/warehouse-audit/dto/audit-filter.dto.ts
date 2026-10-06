import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import {
  WarehouseAuditActorType,
  WarehouseAuditActionType,
  WarehouseAuditEntityType,
  WarehouseAuditOutcome,
} from '../interfaces';

export class WarehouseAuditLogFilterDto {
  @IsString()
  workspaceId!: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsEnum(WarehouseAuditActorType)
  actorType?: WarehouseAuditActorType;

  @IsOptional()
  @IsString()
  actorId?: string;

  @IsOptional()
  @IsEnum(WarehouseAuditActionType)
  actionType?: WarehouseAuditActionType;

  @IsOptional()
  @IsEnum(WarehouseAuditEntityType)
  entityType?: WarehouseAuditEntityType;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsEnum(WarehouseAuditOutcome)
  outcome?: WarehouseAuditOutcome;

  @IsOptional()
  @IsString()
  correlationId?: string;

  @IsOptional()
  @IsString()
  requestId?: string;

  @IsOptional()
  @IsString()
  jobId?: string;

  @IsOptional()
  @IsString()
  barcodeId?: string;

  @IsOptional()
  @IsString()
  module?: string;

  @IsOptional()
  @IsString()
  operation?: string;

  @IsOptional()
  @IsBoolean()
  suspicious?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
