import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnalysisStatus, CompetitionProvider } from '../interfaces';

export class CompetitionAnalysisResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  workspaceId!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  opportunityId!: string;

  @ApiProperty({ example: 1 })
  version!: number;

  @ApiProperty({ enum: CompetitionProvider, example: CompetitionProvider.AMAZON_SEARCH })
  provider!: string;

  @ApiProperty({ enum: AnalysisStatus })
  status!: AnalysisStatus;

  @ApiPropertyOptional({ example: 42 })
  competitorCount?: number | null;

  @ApiPropertyOptional({ example: 29.99 })
  averagePrice?: number | null;

  @ApiPropertyOptional({ example: 9.99 })
  minPrice?: number | null;

  @ApiPropertyOptional({ example: 89.99 })
  maxPrice?: number | null;

  @ApiPropertyOptional({ example: 80.0 })
  priceRange?: number | null;

  @ApiPropertyOptional()
  ratingDistribution?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  reviewDistribution?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  brandDominance?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  sellerTypeBreakdown?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  listingQuality?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  keywordCompetition?: Record<string, unknown> | null;

  @ApiPropertyOptional({ example: 65.5, description: 'Competition score 0–100. Higher = more competitive.' })
  competitionScore?: number | null;

  @ApiPropertyOptional()
  startedAt?: Date | null;

  @ApiPropertyOptional()
  completedAt?: Date | null;

  @ApiPropertyOptional()
  errorMessage?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional()
  deletedAt?: Date | null;
}
