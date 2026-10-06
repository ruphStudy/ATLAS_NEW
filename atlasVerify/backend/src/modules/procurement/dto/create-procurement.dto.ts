import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProcurementAttachmentDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() url!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mimeType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() sizeBytes?: number;
}

export class CreateProcurementDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  rfqId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  quotationComparisonId?: string;

  @ApiProperty({ description: 'Order quantity' })
  @IsNumber()
  @IsPositive()
  quantity!: number;

  @ApiProperty({ description: 'Agreed cost per unit' })
  @IsNumber()
  @IsPositive()
  agreedUnitCost!: number;

  @ApiPropertyOptional({ default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliveryTerms?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string;

  @ApiPropertyOptional({ description: 'User ID of the procurement owner' })
  @IsOptional()
  @IsString()
  procurementOwner?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [ProcurementAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcurementAttachmentDto)
  attachments?: ProcurementAttachmentDto[];
}
