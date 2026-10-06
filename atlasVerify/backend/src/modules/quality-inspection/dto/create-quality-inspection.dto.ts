import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  IsBoolean,
  IsDateString,
  Min,
  ValidateNested,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  InspectionType,
  SamplingMethod,
  DefectSeverity,
} from '../interfaces';

export class InspectedProductDto {
  @IsString()
  productId!: string;

  @IsString()
  productName!: string;

  @IsOptional()
  @IsString()
  sku?: string;
}

export class DefectDetailDto {
  @IsString()
  description!: string;

  @IsEnum(DefectSeverity)
  severity!: DefectSeverity;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  imageUrls?: string[];
}

export class ChecklistItemDto {
  @IsString()
  id!: string;

  @IsString()
  description!: string;

  @IsBoolean()
  passed!: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class InspectionAttachmentDto {
  @IsString()
  name!: string;

  @IsUrl()
  url!: string;

  @IsEnum(['image', 'document'])
  type!: 'image' | 'document';
}

export class CreateQualityInspectionDto {
  @IsOptional()
  @IsString()
  shipmentId?: string;

  @IsOptional()
  @IsString()
  purchaseOrderId?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  parentInspectionId?: string;

  @IsEnum(InspectionType)
  inspectionType!: InspectionType;

  @IsEnum(SamplingMethod)
  samplingMethod!: SamplingMethod;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InspectedProductDto)
  products?: InspectedProductDto[];

  @IsOptional()
  @IsString()
  inspector?: string;

  @IsOptional()
  @IsString()
  inspectorName?: string;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @IsOptional()
  @IsDateString()
  inspectionDate?: string;

  @IsNumber()
  @Min(0)
  quantityOrdered!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantityInspected?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantityPassed?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantityFailed?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DefectDetailDto)
  defects?: DefectDetailDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  checklist?: ChecklistItemDto[];

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InspectionAttachmentDto)
  attachments?: InspectionAttachmentDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;
}
