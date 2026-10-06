import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProcurementAttachment, ProcurementStatus } from '../interfaces';

export class ProcurementHistoryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() procurementId!: string;
  @ApiProperty({ enum: ProcurementStatus }) fromStatus!: ProcurementStatus;
  @ApiProperty({ enum: ProcurementStatus }) toStatus!: ProcurementStatus;
  @ApiProperty() changedBy!: string;
  @ApiPropertyOptional() reason!: string | null;
  @ApiProperty() createdAt!: Date;
}

export class ProcurementResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() workspaceId!: string;
  @ApiProperty() procurementNumber!: string;
  @ApiPropertyOptional() productId!: string | null;
  @ApiPropertyOptional() supplierId!: string | null;
  @ApiPropertyOptional() rfqId!: string | null;
  @ApiPropertyOptional() quotationComparisonId!: string | null;
  @ApiProperty({ enum: ProcurementStatus }) status!: ProcurementStatus;
  @ApiProperty() quantity!: number;
  @ApiProperty() agreedUnitCost!: number;
  @ApiProperty() totalCost!: number;
  @ApiProperty() currency!: string;
  @ApiPropertyOptional() paymentTerms!: string | null;
  @ApiPropertyOptional() deliveryTerms!: string | null;
  @ApiPropertyOptional() expectedDeliveryDate!: Date | null;
  @ApiPropertyOptional() procurementOwner!: string | null;
  @ApiPropertyOptional() notes!: string | null;
  @ApiPropertyOptional({ type: [Object] }) attachments!: ProcurementAttachment[] | null;
  @ApiPropertyOptional() approvedBy!: string | null;
  @ApiPropertyOptional() approvedAt!: Date | null;
  @ApiPropertyOptional() orderedAt!: Date | null;
  @ApiPropertyOptional() cancelReason!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiPropertyOptional() deletedAt!: Date | null;
}

export class ProcurementListResponseDto {
  @ApiProperty({ type: [ProcurementResponseDto] }) items!: ProcurementResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
}
