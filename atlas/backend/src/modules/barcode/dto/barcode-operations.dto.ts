import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { BarcodeType, BarcodeEntityType, LabelSize } from '../interfaces';

export class GenerateBarcodeDto {
  @IsEnum(BarcodeEntityType)
  entityType!: BarcodeEntityType;

  @IsString()
  entityId!: string;

  @IsOptional()
  @IsEnum(BarcodeType)
  type?: BarcodeType;

  @IsOptional()
  @IsString()
  customValue?: string;

  @IsOptional()
  @IsString()
  gs1Prefix?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class BulkGenerateBarcodeDto {
  @IsEnum(BarcodeEntityType)
  entityType!: BarcodeEntityType;

  @IsArray()
  @IsString({ each: true })
  entityIds!: string[];

  @IsOptional()
  @IsEnum(BarcodeType)
  type?: BarcodeType;

  @IsOptional()
  @IsString()
  gs1Prefix?: string;
}

export class AssignBarcodeDto {
  @IsString()
  value!: string;

  @IsEnum(BarcodeEntityType)
  entityType!: BarcodeEntityType;

  @IsString()
  entityId!: string;

  @IsOptional()
  @IsEnum(BarcodeType)
  type?: BarcodeType;
}

export class ScanBarcodeDto {
  @IsString()
  value!: string;

  @IsOptional()
  @IsString()
  scannedBy?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  locationContext?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class PrintLabelDto {
  @IsString()
  barcodeId!: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsEnum(LabelSize)
  labelSize?: LabelSize;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  printedBy?: string;

  @IsOptional()
  @IsString()
  printerName?: string;
}

export class BulkPrintLabelDto {
  @IsArray()
  @IsString({ each: true })
  barcodeIds!: string[];

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsEnum(LabelSize)
  labelSize?: LabelSize;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantityPerLabel?: number;

  @IsOptional()
  @IsString()
  printedBy?: string;

  @IsOptional()
  @IsString()
  printerName?: string;
}

export class ReplaceBarcodeDto {
  @IsOptional()
  @IsString()
  newValue?: string;

  @IsOptional()
  @IsEnum(BarcodeType)
  newType?: BarcodeType;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateLabelTemplateDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(BarcodeEntityType)
  entityType!: BarcodeEntityType;

  @IsOptional()
  @IsEnum(LabelSize)
  size?: LabelSize;

  @IsOptional()
  @IsNumber()
  width?: number;

  @IsOptional()
  @IsNumber()
  height?: number;

  @IsArray()
  @IsString({ each: true })
  fields!: string[];

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsObject()
  printerSettings?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateLabelTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(LabelSize)
  size?: LabelSize;

  @IsOptional()
  @IsNumber()
  width?: number;

  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsObject()
  printerSettings?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
