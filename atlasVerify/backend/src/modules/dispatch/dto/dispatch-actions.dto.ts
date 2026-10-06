import { IsArray, IsEnum, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DispatchExceptionType } from '../interfaces';

export class AssignDispatchDto {
  @IsString()
  assignedTo!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class StartDispatchDto {
  @IsOptional()
  @IsString()
  startedBy?: string;
}

export class DispatchPackageExecutionDto {
  @IsString()
  packageId!: string;

  @IsOptional()
  @IsArray()
  scannedBarcodes?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ExecuteDispatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DispatchPackageExecutionDto)
  packages!: DispatchPackageExecutionDto[];

  @IsOptional()
  @IsString()
  executedBy?: string;
}

export class UpdateDispatchDto {
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
  manifestId?: string;

  @IsOptional()
  @IsString()
  manifestUrl?: string;

  @IsOptional()
  @IsString()
  pickupReference?: string;

  @IsOptional()
  @IsString()
  dispatchReference?: string;

  @IsOptional()
  @IsString()
  dispatchNoteUrl?: string;

  @IsOptional()
  @IsString()
  handoverUrl?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CompleteDispatchDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  completedBy?: string;
}

export class CancelDispatchDto {
  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  cancelledBy?: string;
}

export class ReopenDispatchDto {
  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  reopenedBy?: string;
}

export class RecordExceptionDto {
  @IsOptional()
  @IsString()
  packageId?: string;

  @IsEnum(DispatchExceptionType)
  exceptionType!: DispatchExceptionType;

  @IsString()
  description!: string;

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
  packageId?: string;

  @IsEnum(['PACKAGE', 'DISPATCH_LOCATION'])
  scanType!: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  scannedBy?: string;
}
