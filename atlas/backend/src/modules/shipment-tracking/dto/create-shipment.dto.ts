import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
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

export class ShipmentAddressDto {
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

export class ShipmentPackageDto {
  @ApiProperty() @IsNumber() @Min(1) packageNumber!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) weight?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() weightUnit?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) length?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) width?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) height?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() dimensionUnit?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() trackingNumber?: string;
}

export class ShipmentAttachmentDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() url!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mimeType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) sizeBytes?: number;
}

export class CreateShipmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  purchaseOrderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'True if this is a partial shipment against the PO', default: false })
  @IsOptional()
  @IsBoolean()
  isPartial?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  carrier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional({ description: 'e.g. SEA, AIR, ROAD, COURIER' })
  @IsOptional()
  @IsString()
  shipmentMethod?: string;

  @ApiPropertyOptional({ type: ShipmentAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShipmentAddressDto)
  origin?: ShipmentAddressDto;

  @ApiPropertyOptional({ type: ShipmentAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShipmentAddressDto)
  destination?: ShipmentAddressDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dispatchDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  estimatedDeliveryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCost?: number;

  @ApiPropertyOptional({ default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalWeight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  weightUnit?: string;

  @ApiPropertyOptional({ type: [ShipmentPackageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShipmentPackageDto)
  packages?: ShipmentPackageDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [ShipmentAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShipmentAttachmentDto)
  attachments?: ShipmentAttachmentDto[];
}
