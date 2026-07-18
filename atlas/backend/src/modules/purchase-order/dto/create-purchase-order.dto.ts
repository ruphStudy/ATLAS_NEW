import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class POAddressDto {
  @ApiPropertyOptional() @IsOptional() @IsString() companyName?: string;
  @ApiProperty() @IsString() street!: string;
  @ApiProperty() @IsString() city!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() postalCode?: string;
  @ApiProperty() @IsString() country!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactEmail?: string;
}

export class POLineItemDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() productId?: string;
  @ApiProperty() @IsString() description!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sku?: string;
  @ApiProperty() @IsNumber() @IsPositive() quantity!: number;
  @ApiProperty() @IsNumber() @IsPositive() unitPrice!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class POAttachmentDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() url!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mimeType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) sizeBytes?: number;
}

export class CreatePurchaseOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  procurementId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiProperty({ type: [POLineItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => POLineItemDto)
  lineItems!: POLineItemDto[];

  @ApiProperty({ default: 'USD' })
  @IsString()
  currency!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shippingTerms?: string;

  @ApiPropertyOptional({ description: 'Incoterms (e.g. FOB, DDP, CIF)' })
  @IsOptional()
  @IsString()
  incoterms?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedDispatchDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string;

  @ApiPropertyOptional({ type: POAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => POAddressDto)
  billingAddress?: POAddressDto;

  @ApiPropertyOptional({ type: POAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => POAddressDto)
  shippingAddress?: POAddressDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [POAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => POAttachmentDto)
  attachments?: POAttachmentDto[];
}
