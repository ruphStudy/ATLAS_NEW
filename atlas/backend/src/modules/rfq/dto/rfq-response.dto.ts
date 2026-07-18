import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RfqStatus, RfqSupplierResponseStatus, RfqAttachment } from '../interfaces';

export class RfqSupplierResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() rfqId!: string;
  @ApiProperty() supplierId!: string;
  @ApiProperty({ enum: RfqSupplierResponseStatus }) status!: RfqSupplierResponseStatus;
  @ApiPropertyOptional() sentAt?: Date | null;
  @ApiPropertyOptional() respondedAt?: Date | null;
  @ApiPropertyOptional() quotedPrice?: number | null;
  @ApiPropertyOptional() quotedLeadTimeDays?: number | null;
  @ApiPropertyOptional() quotedMoq?: number | null;
  @ApiPropertyOptional() supplierNotes?: string | null;
  @ApiPropertyOptional({ type: Object }) counterOfferDetails?: Record<string, unknown> | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class RfqResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() workspaceId!: string;
  @ApiProperty() rfqNumber!: string;
  @ApiProperty() title!: string;
  @ApiPropertyOptional() description?: string | null;
  @ApiPropertyOptional() productId?: string | null;
  @ApiPropertyOptional() opportunityId?: string | null;
  @ApiProperty({ enum: RfqStatus }) status!: RfqStatus;
  @ApiProperty() quantity!: number;
  @ApiPropertyOptional() moq?: number | null;
  @ApiPropertyOptional() targetPrice?: number | null;
  @ApiProperty() currency!: string;
  @ApiPropertyOptional() requiredDeliveryDate?: Date | null;
  @ApiPropertyOptional() expiresAt?: Date | null;
  @ApiPropertyOptional() paymentTerms?: string | null;
  @ApiPropertyOptional() shippingTerms?: string | null;
  @ApiPropertyOptional() notes?: string | null;
  @ApiPropertyOptional({ type: [Object] }) attachments?: RfqAttachment[] | null;
  @ApiPropertyOptional({ type: [RfqSupplierResponseDto] }) supplierResponses?: RfqSupplierResponseDto[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiPropertyOptional() deletedAt?: Date | null;
}

export class RfqListResponseDto {
  @ApiProperty({ type: [RfqResponseDto] }) items!: RfqResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
}
