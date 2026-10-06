import { IsArray, IsBoolean, IsEnum, IsNumber, IsObject, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PackingExceptionType } from '../interfaces';

export class AssignPackingDto {
  @IsString()
  assignedTo!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class StartPackingDto {
  @IsOptional()
  @IsString()
  startedBy?: string;
}

export class PausePackingDto {
  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  pausedBy?: string;
}

export class ResumePackingDto {
  @IsOptional()
  @IsString()
  resumedBy?: string;
}

export class PackingLineExecutionDto {
  @IsString()
  lineId!: string;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsOptional()
  @IsString()
  packageId?: string;

  @IsOptional()
  @IsArray()
  scannedBarcodes?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ExecutePackingDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackingLineExecutionDto)
  lines!: PackingLineExecutionDto[];

  @IsOptional()
  @IsString()
  executedBy?: string;
}

export class UpdatePackageDto {
  @IsOptional()
  @IsNumber()
  length?: number;

  @IsOptional()
  @IsNumber()
  width?: number;

  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsArray()
  contents?: unknown[];

  @IsOptional()
  @IsArray()
  packingMaterial?: unknown[];

  @IsOptional()
  @IsString()
  labelUrl?: string;

  @IsOptional()
  @IsString()
  packingSlipUrl?: string;

  @IsOptional()
  @IsArray()
  evidenceUrls?: string[];

  @IsOptional()
  @IsBoolean()
  shipmentReady?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CompletePackingDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  completedBy?: string;
}

export class CancelPackingDto {
  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  cancelledBy?: string;
}

export class ReopenPackingDto {
  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  reopenedBy?: string;
}

export class RecordExceptionDto {
  @IsOptional()
  @IsString()
  lineId?: string;

  @IsOptional()
  @IsString()
  packageId?: string;

  @IsEnum(PackingExceptionType)
  exceptionType!: PackingExceptionType;

  @IsString()
  description!: string;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsArray()
  evidenceUrls?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ScanBarcodeDto {
  @IsString()
  barcode!: string;

  @IsOptional()
  @IsString()
  lineId?: string;

  @IsEnum(['ITEM', 'PACKAGE', 'BATCH', 'SERIAL'])
  scanType!: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  scannedBy?: string;
}
