import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OpportunityStatus } from '../interfaces';

export class OpportunityResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string = '';

  @ApiProperty({ example: 'workspace-uuid' })
  workspaceId: string = '';

  @ApiProperty({ example: 'wireless earbuds' })
  keyword: string = '';

  @ApiProperty({ example: 'AMAZON_US' })
  marketplace: string = '';

  @ApiProperty({ example: 'US' })
  country: string = 'US';

  @ApiPropertyOptional({ example: 'Electronics', nullable: true })
  category: string | null = null;

  @ApiPropertyOptional({
    example: null,
    nullable: true,
    description: 'Set when this Opportunity was created by promoting a MarketplaceProductCandidate; null for manual opportunities.',
  })
  marketplaceProductCandidateId: string | null = null;

  @ApiPropertyOptional({ example: 78.5, nullable: true })
  demandScore: number | null = null;

  @ApiPropertyOptional({ example: 42.0, nullable: true })
  competitionScore: number | null = null;

  @ApiPropertyOptional({ example: 65.0, nullable: true })
  supplierScore: number | null = null;

  @ApiPropertyOptional({ example: 55.0, nullable: true })
  profitScore: number | null = null;

  @ApiPropertyOptional({ example: 82.0, nullable: true })
  aiScore: number | null = null;

  @ApiPropertyOptional({ example: 68.5, nullable: true })
  finalScore: number | null = null;

  @ApiPropertyOptional({ example: 'Strong demand. Recommend sourcing.', nullable: true })
  recommendation: string | null = null;

  @ApiProperty({ enum: OpportunityStatus, example: OpportunityStatus.DISCOVERED })
  status: OpportunityStatus = OpportunityStatus.DISCOVERED;

  @ApiPropertyOptional({ example: 'Initial discovery.', nullable: true })
  notes: string | null = null;

  @ApiProperty({ example: '2026-07-14T10:00:00.000Z' })
  createdAt: string = '';

  @ApiProperty({ example: '2026-07-14T10:00:00.000Z' })
  updatedAt: string = '';
}

export class OpportunityListResponseDto {
  @ApiProperty({ type: [OpportunityResponseDto] })
  items: OpportunityResponseDto[] = [];

  @ApiProperty({ example: 10 })
  total: number = 0;

  @ApiProperty({ example: 1 })
  page: number = 1;

  @ApiProperty({ example: 20 })
  limit: number = 20;
}
