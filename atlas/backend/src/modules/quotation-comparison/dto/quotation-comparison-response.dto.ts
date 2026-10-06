import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ComparisonRecommendation, ComparisonStatus, ComparisonWeights, SupplierScoreBreakdown } from '../interfaces';

export class SupplierScoreBreakdownDto implements SupplierScoreBreakdown {
  @ApiProperty() supplierId!: string;
  @ApiProperty() rfqSupplierId!: string;
  @ApiPropertyOptional() providerCode!: string | null;
  @ApiPropertyOptional() providerQuotationRef!: string | null;
  @ApiPropertyOptional() quotedUnitPrice!: number | null;
  @ApiPropertyOptional() quotedTotalCost!: number | null;
  @ApiPropertyOptional() quotedMoq!: number | null;
  @ApiPropertyOptional() quotedLeadTimeDays!: number | null;
  @ApiPropertyOptional() paymentTerms!: string | null;
  @ApiPropertyOptional() shippingTerms!: string | null;
  @ApiProperty({ type: [String] }) certifications!: string[];
  @ApiPropertyOptional() verificationScore!: number | null;
  @ApiPropertyOptional() riskScore!: number | null;
  @ApiPropertyOptional() performanceScore!: number | null;
  @ApiProperty() unitPriceScore!: number;
  @ApiProperty() totalCostScore!: number;
  @ApiProperty() moqScore!: number;
  @ApiProperty() leadTimeScore!: number;
  @ApiProperty() paymentTermsScore!: number;
  @ApiProperty() shippingTermsScore!: number;
  @ApiProperty() certificationsScore!: number;
  @ApiProperty() verificationScoreNorm!: number;
  @ApiProperty() riskScoreNorm!: number;
  @ApiProperty() performanceScoreNorm!: number;
  @ApiProperty() comparisonScore!: number;
  @ApiProperty({ enum: ComparisonRecommendation }) recommendation!: ComparisonRecommendation;
  @ApiProperty() rank!: number;
}

export class QuotationComparisonResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() workspaceId!: string;
  @ApiProperty() rfqId!: string;
  @ApiProperty() version!: number;
  @ApiProperty({ enum: ComparisonStatus }) status!: ComparisonStatus;
  @ApiProperty({ type: Object }) weights!: ComparisonWeights;
  @ApiProperty({ type: [SupplierScoreBreakdownDto] }) supplierBreakdowns!: SupplierScoreBreakdownDto[];
  @ApiPropertyOptional() recommendedSupplierId!: string | null;
  @ApiPropertyOptional() selectedSupplierId!: string | null;
  @ApiPropertyOptional() selectionReason!: string | null;
  @ApiPropertyOptional() selectionBy!: string | null;
  @ApiPropertyOptional() selectionAt!: Date | null;
  @ApiPropertyOptional() notes!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiPropertyOptional() deletedAt!: Date | null;
}

export class QuotationComparisonListResponseDto {
  @ApiProperty({ type: [QuotationComparisonResponseDto] }) items!: QuotationComparisonResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
}
