import { IsArray, IsEnum, IsNumber, IsObject, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ExceptionType } from '../interfaces';

export class AssignPickingDto {
  @IsString()
  assignedTo!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReleasePickingDto {
  @IsOptional()
  @IsString()
  releasedBy?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class StartPickingDto {
  @IsOptional()
  @IsString()
  startedBy?: string;
}

export class PausePickingDto {
  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  pausedBy?: string;
}

export class ResumePickingDto {
  @IsOptional()
  @IsString()
  resumedBy?: string;
}

export class PickingLineExecutionDto {
  @IsString()
  lineId!: string;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shortQuantity?: number;

  @IsOptional()
  @IsString()
  stagingLocationId?: string;

  @IsOptional()
  @IsArray()
  scannedBarcodes?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ExecutePickingDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PickingLineExecutionDto)
  lines!: PickingLineExecutionDto[];

  @IsOptional()
  @IsString()
  executedBy?: string;
}

export class CompletePickingDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  completedBy?: string;
}

export class CancelPickingDto {
  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  cancelledBy?: string;

  @IsOptional()
  @IsString()
  releaseAllocations?: string;
}

export class ReassignPickingDto {
  @IsString()
  newAssignee!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  reassignedBy?: string;
}

export class RecordExceptionDto {
  @IsOptional()
  @IsString()
  lineId?: string;

  @IsEnum(ExceptionType)
  exceptionType!: ExceptionType;

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

  @IsEnum(['SOURCE_BIN', 'ITEM', 'BATCH', 'SERIAL'])
  scanType!: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  scannedBy?: string;
}
