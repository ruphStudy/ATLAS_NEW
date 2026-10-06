import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { POAddress, POAttachment, POLineItem, PurchaseOrderStatus } from '../interfaces';

export class PurchaseOrderHistoryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() purchaseOrderId!: string;
  @ApiProperty({ enum: PurchaseOrderStatus }) fromStatus!: PurchaseOrderStatus;
  @ApiProperty({ enum: PurchaseOrderStatus }) toStatus!: PurchaseOrderStatus;
  @ApiProperty() version!: number;
  @ApiProperty() changedBy!: string;
  @ApiPropertyOptional() reason!: string | null;
  @ApiProperty() createdAt!: Date;
}

export class PurchaseOrderResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() workspaceId!: string;
  @ApiProperty() poNumber!: string;
  @ApiProperty() version!: number;
  @ApiPropertyOptional() procurementId!: string | null;
  @ApiPropertyOptional() supplierId!: string | null;
  @ApiProperty({ enum: PurchaseOrderStatus }) status!: PurchaseOrderStatus;
  @ApiProperty({ type: [Object] }) lineItems!: POLineItem[];
  @ApiProperty() totalAmount!: number;
  @ApiProperty() currency!: string;
  @ApiPropertyOptional() paymentTerms!: string | null;
  @ApiPropertyOptional() shippingTerms!: string | null;
  @ApiPropertyOptional() incoterms!: string | null;
  @ApiPropertyOptional() expectedDispatchDate!: Date | null;
  @ApiPropertyOptional() expectedDeliveryDate!: Date | null;
  @ApiPropertyOptional({ type: Object }) billingAddress!: POAddress | null;
  @ApiPropertyOptional({ type: Object }) shippingAddress!: POAddress | null;
  @ApiPropertyOptional() notes!: string | null;
  @ApiPropertyOptional({ type: [Object] }) attachments!: POAttachment[] | null;
  @ApiPropertyOptional() approvedBy!: string | null;
  @ApiPropertyOptional() approvedAt!: Date | null;
  @ApiPropertyOptional() issuedAt!: Date | null;
  @ApiPropertyOptional() acknowledgedAt!: Date | null;
  @ApiPropertyOptional() cancelReason!: string | null;
  @ApiPropertyOptional() providerCode!: string | null;
  @ApiPropertyOptional() providerPoRef!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiPropertyOptional() deletedAt!: Date | null;
}

export class PurchaseOrderListResponseDto {
  @ApiProperty({ type: [PurchaseOrderResponseDto] }) items!: PurchaseOrderResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
}

export class PurchaseOrderExportDto {
  @ApiProperty() poNumber!: string;
  @ApiProperty() version!: number;
  @ApiProperty({ enum: PurchaseOrderStatus }) status!: PurchaseOrderStatus;
  @ApiPropertyOptional() supplierId!: string | null;
  @ApiProperty({ type: [Object] }) lineItems!: POLineItem[];
  @ApiProperty() totalAmount!: number;
  @ApiProperty() currency!: string;
  @ApiPropertyOptional() paymentTerms!: string | null;
  @ApiPropertyOptional() shippingTerms!: string | null;
  @ApiPropertyOptional() incoterms!: string | null;
  @ApiPropertyOptional() expectedDispatchDate!: Date | null;
  @ApiPropertyOptional() expectedDeliveryDate!: Date | null;
  @ApiPropertyOptional({ type: Object }) billingAddress!: POAddress | null;
  @ApiPropertyOptional({ type: Object }) shippingAddress!: POAddress | null;
  @ApiPropertyOptional() notes!: string | null;
  @ApiProperty() issuedAt!: Date | null;
  @ApiProperty() createdAt!: Date;
}
