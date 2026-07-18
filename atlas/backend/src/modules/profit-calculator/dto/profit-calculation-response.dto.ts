import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnalysisStatus, ProfitProvider } from '../interfaces';

export class ProfitCalculationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() workspaceId!: string;
  @ApiProperty() opportunityId!: string;
  @ApiProperty() version!: number;
  @ApiProperty({ enum: ProfitProvider }) provider!: string;
  @ApiProperty({ enum: AnalysisStatus }) status!: AnalysisStatus;

  // Costs
  @ApiPropertyOptional() productCost?: number | null;
  @ApiPropertyOptional() shippingCost?: number | null;
  @ApiPropertyOptional() packagingCost?: number | null;
  @ApiPropertyOptional() advertisingCost?: number | null;
  @ApiPropertyOptional() tax?: number | null;
  @ApiPropertyOptional() marketplaceFees?: number | null;
  @ApiPropertyOptional() fbaFees?: number | null;
  @ApiPropertyOptional() totalLandedCost?: number | null;

  // Revenue & profit
  @ApiPropertyOptional() sellingPrice?: number | null;
  @ApiPropertyOptional() grossProfit?: number | null;
  @ApiPropertyOptional() netProfit?: number | null;
  @ApiPropertyOptional({ description: 'Profit margin %' }) profitMargin?: number | null;
  @ApiPropertyOptional({ description: 'ROI %' }) roi?: number | null;
  @ApiPropertyOptional() breakEvenPrice?: number | null;

  // Score
  @ApiPropertyOptional({ description: 'Profit score 0–100' }) profitScore?: number | null;

  @ApiPropertyOptional() startedAt?: Date | null;
  @ApiPropertyOptional() completedAt?: Date | null;
  @ApiPropertyOptional() errorMessage?: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiPropertyOptional() deletedAt?: Date | null;
}
