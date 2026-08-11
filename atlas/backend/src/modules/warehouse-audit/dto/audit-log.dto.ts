import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsObject,
} from 'class-validator';
import {
  WarehouseAuditActorType,
  WarehouseAuditActionType,
  WarehouseAuditEntityType,
  WarehouseAuditOutcome,
} from '../interfaces';

export class RecordAuditLogDto {
  @IsString()
  workspaceId: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsEnum(WarehouseAuditActorType)
  actorType: WarehouseAuditActorType;

  @IsOptional()
  @IsString()
  actorId?: string;

  @IsOptional()
  @IsString()
  actorName?: string;

  @IsEnum(WarehouseAuditActionType)
  actionType: WarehouseAuditActionType;

  @IsOptional()
  @IsString()
  actionDescription?: string;

  @IsEnum(WarehouseAuditEntityType)
  entityType: WarehouseAuditEntityType;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  entityReference?: string;

  @IsEnum(WarehouseAuditOutcome)
  @IsOptional()
  outcome?: WarehouseAuditOutcome;

  @IsOptional()
  @IsObject()
  beforeState?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  afterState?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  changes?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  errorMessage?: string;

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
  externalReference?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  module?: string;

  @IsOptional()
  @IsString()
  operation?: string;

  @IsBoolean()
  @IsOptional()
  suspicious?: boolean;

  @IsOptional()
  @IsString()
  suspiciousReason?: string;
}
