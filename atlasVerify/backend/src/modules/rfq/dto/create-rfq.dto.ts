import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RfqAttachment } from '../interfaces';

export class CreateRfqDto {
  @ApiProperty({ example: 'RFQ for Bluetooth Earphones – Q3 2026' })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Product ID (optional reference)' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ description: 'Opportunity ID (optional reference)' })
  @IsOptional()
  @IsUUID()
  opportunityId?: string;

  @ApiProperty({ description: 'Supplier IDs to send RFQ to', type: [String] })
  @IsArray()
  @IsUUID('all', { each: true })
  supplierIds!: string[];

  @ApiProperty({ example: 500, description: 'Required quantity' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity!: number;

  @ApiPropertyOptional({ example: 100, description: 'Minimum order quantity' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  moq?: number;

  @ApiPropertyOptional({ example: 15.99, description: 'Target unit price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  targetPrice?: number;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  currency?: string;

  @ApiPropertyOptional({ example: '2026-09-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  requiredDeliveryDate?: string;

  @ApiPropertyOptional({ example: '2026-08-01T00:00:00Z', description: 'RFQ expiry date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ example: 'Net 30' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  paymentTerms?: string;

  @ApiPropertyOptional({ example: 'FOB Shanghai' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  shippingTerms?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  attachments?: RfqAttachment[];
}
