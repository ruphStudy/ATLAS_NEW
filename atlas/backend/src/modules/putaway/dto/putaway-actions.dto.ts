import { IsArray, IsNumber, IsObject, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AssignPutawayDto {
  @IsString()
  assignedTo!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class StartPutawayDto {
  @IsOptional()
  @IsString()
  startedBy?: string;
}

export class PutawayLineExecutionDto {
  @IsString()
  lineId!: string;

  @IsOptional()
  @IsString()
  destinationZoneId?: string;

  @IsOptional()
  @IsString()
  destinationLocationId?: string;

  @IsOptional()
  @IsString()
  destinationBinId?: string;

  @IsOptional()
  @IsString()
  overrideReason?: string;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsOptional()
  @IsArray()
  scannedBarcodes?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ExecutePutawayDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PutawayLineExecutionDto)
  lines!: PutawayLineExecutionDto[];

  @IsOptional()
  @IsString()
  executedBy?: string;
}

export class CompletePutawayDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  completedBy?: string;
}

export class CancelPutawayDto {
  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  cancelledBy?: string;
}

export class ReassignPutawayDto {
  @IsString()
  newAssignee!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  reassignedBy?: string;
}

export class ScanLocationDto {
  @IsString()
  barcode!: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  scannedBy?: string;
}
