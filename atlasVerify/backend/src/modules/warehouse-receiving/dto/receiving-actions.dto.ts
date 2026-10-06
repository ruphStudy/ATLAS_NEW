import { IsArray, IsBoolean, IsDateString, IsEnum, IsNumber, IsObject, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DiscrepancyType } from '../interfaces';

export class StartReceivingDto {
  @IsOptional()
  @IsString()
  receivedBy?: string;
}

export class ReceiveLineDto {
  @IsString()
  lineId!: string;

  @IsNumber()
  @Min(0)
  receivedQuantity!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  acceptedQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rejectedQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  damagedQuantity?: number;

  @IsOptional()
  @IsString()
  batchNumber?: string;

  @IsOptional()
  @IsString()
  lotNumber?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsDateString()
  manufactureDate?: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  binId?: string;

  @IsOptional()
  @IsString()
  stockStatus?: string;

  @IsOptional()
  @IsBoolean()
  hasDiscrepancy?: boolean;

  @IsOptional()
  @IsEnum(DiscrepancyType)
  discrepancyType?: DiscrepancyType;

  @IsOptional()
  @IsString()
  discrepancyReason?: string;

  @IsOptional()
  @IsString()
  discrepancyNotes?: string;

  @IsOptional()
  @IsArray()
  evidenceUrls?: string[];

  @IsOptional()
  @IsArray()
  scannedBarcodes?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ReceiveLinesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveLineDto)
  lines!: ReceiveLineDto[];

  @IsOptional()
  @IsString()
  receivedBy?: string;
}

export class CompleteReceivingDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  receivedBy?: string;
}

export class CancelReceivingDto {
  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  cancelledBy?: string;
}

export class ReopenReceivingDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  reopenedBy?: string;
}

export class ScanPackageDto {
  @IsString()
  barcode!: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  scannedBy?: string;
}
