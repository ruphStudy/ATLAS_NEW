import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnalysisStatus, Recommendation, RiskLevel, ConfidenceLevel } from '../interfaces';

export class ProductScoringResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() workspaceId!: string;
  @ApiProperty() opportunityId!: string;
  @ApiProperty() version!: number;
  @ApiProperty({ enum: AnalysisStatus }) status!: AnalysisStatus;

  // Scores
  @ApiPropertyOptional({ description: 'Overall product score 0–100' }) finalScore?: number | null;
  @ApiPropertyOptional() demandScore?: number | null;
  @ApiPropertyOptional() competitionScore?: number | null;
  @ApiPropertyOptional() profitScore?: number | null;
  @ApiPropertyOptional() supplierScore?: number | null;

  // Weights applied
  @ApiPropertyOptional() weights?: Record<string, number> | null;

  // Insights
  @ApiPropertyOptional({ enum: Recommendation }) recommendation?: string | null;
  @ApiPropertyOptional({ enum: ConfidenceLevel }) confidenceLevel?: string | null;
  @ApiPropertyOptional({ description: 'Confidence score 0–100' }) confidenceScore?: number | null;
  @ApiPropertyOptional({ type: [String] }) strengths?: string[] | null;
  @ApiPropertyOptional({ type: [String] }) weaknesses?: string[] | null;
  @ApiPropertyOptional({ enum: RiskLevel }) riskLevel?: string | null;

  // Execution
  @ApiPropertyOptional() startedAt?: Date | null;
  @ApiPropertyOptional() completedAt?: Date | null;
  @ApiPropertyOptional() errorMessage?: string | null;

  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiPropertyOptional() deletedAt?: Date | null;
}
