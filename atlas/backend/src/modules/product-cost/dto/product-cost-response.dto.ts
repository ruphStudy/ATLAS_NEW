import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CostBreakdown, CostComponents } from '../interfaces';

export class ProductCostResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() workspaceId!: string;
  @ApiPropertyOptional() productId!: string | null;
  @ApiPropertyOptional() opportunityId!: string | null;
  @ApiPropertyOptional() rfqId!: string | null;
  @ApiPropertyOptional() rfqSupplierId!: string | null;
  @ApiPropertyOptional() supplierId!: string | null;
  @ApiProperty() version!: number;
  @ApiProperty({ type: Object }) inputs!: CostComponents;
  @ApiProperty({ type: Object }) breakdown!: CostBreakdown;
  @ApiProperty() totalLandedCost!: number;
  @ApiProperty() costPerUnit!: number;
  @ApiProperty() targetCurrency!: string;
  @ApiPropertyOptional() notes!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiPropertyOptional() deletedAt!: Date | null;
}

export class ProductCostListResponseDto {
  @ApiProperty({ type: [ProductCostResponseDto] }) items!: ProductCostResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
}
