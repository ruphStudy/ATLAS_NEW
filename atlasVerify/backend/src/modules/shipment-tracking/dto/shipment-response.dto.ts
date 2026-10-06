import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ShipmentAddress,
  ShipmentAttachment,
  ShipmentPackage,
  ShipmentStatus,
} from '../interfaces';

export class ShipmentTrackingHistoryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() shipmentId!: string;
  @ApiProperty({ enum: ShipmentStatus }) fromStatus!: ShipmentStatus;
  @ApiProperty({ enum: ShipmentStatus }) toStatus!: ShipmentStatus;
  @ApiPropertyOptional() location!: string | null;
  @ApiProperty() description!: string;
  @ApiProperty() source!: string;
  @ApiPropertyOptional() changedBy!: string | null;
  @ApiProperty() createdAt!: Date;
}

export class ShipmentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() workspaceId!: string;
  @ApiProperty() shipmentNumber!: string;
  @ApiPropertyOptional() purchaseOrderId!: string | null;
  @ApiPropertyOptional() supplierId!: string | null;
  @ApiProperty({ enum: ShipmentStatus }) status!: ShipmentStatus;
  @ApiProperty() isPartial!: boolean;
  @ApiPropertyOptional() carrier!: string | null;
  @ApiPropertyOptional() trackingNumber!: string | null;
  @ApiPropertyOptional() shipmentMethod!: string | null;
  @ApiPropertyOptional({ type: Object }) origin!: ShipmentAddress | null;
  @ApiPropertyOptional({ type: Object }) destination!: ShipmentAddress | null;
  @ApiPropertyOptional() dispatchDate!: Date | null;
  @ApiPropertyOptional() estimatedDeliveryDate!: Date | null;
  @ApiPropertyOptional() actualDeliveryDate!: Date | null;
  @ApiPropertyOptional() shippingCost!: number | null;
  @ApiPropertyOptional() currency!: string | null;
  @ApiPropertyOptional() totalWeight!: number | null;
  @ApiPropertyOptional() weightUnit!: string | null;
  @ApiPropertyOptional({ type: [Object] }) packages!: ShipmentPackage[] | null;
  @ApiPropertyOptional() notes!: string | null;
  @ApiPropertyOptional({ type: [Object] }) attachments!: ShipmentAttachment[] | null;
  @ApiPropertyOptional() lastTrackedAt!: Date | null;
  @ApiPropertyOptional() cancelReason!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiPropertyOptional() deletedAt!: Date | null;
}

export class ShipmentListResponseDto {
  @ApiProperty({ type: [ShipmentResponseDto] }) items!: ShipmentResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
}
