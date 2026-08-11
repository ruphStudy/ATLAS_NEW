import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class ActivateInventoryItemDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class DeactivateInventoryItemDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class DiscontinueInventoryItemDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ArchiveInventoryItemDto {
  @IsString()
  reason!: string;
}

export class ReactivateInventoryItemDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateInventoryConfigDto {
  @IsOptional()
  @IsString()
  valuationMethod?: string;

  @IsOptional()
  @IsBoolean()
  allowNegativeStock?: boolean;

  @IsOptional()
  @IsBoolean()
  autoReorderEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  expiryAlertDays?: number;

  @IsOptional()
  @IsBoolean()
  requiresBatchOnReceipt?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresSerialOnReceipt?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateUnitConversionDto {
  @IsString()
  fromUom!: string;

  @IsString()
  toUom!: string;

  @IsNumber()
  @Min(0)
  factor!: number;

  @IsOptional()
  @IsBoolean()
  isBaseConversion?: boolean;
}
