import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscoveryMode, DiscoverySessionStatus } from '../interfaces';

export class DiscoverySessionResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string = '';

  @ApiProperty({ example: 'workspace-uuid' })
  workspaceId: string = '';

  @ApiProperty({ example: 'AMAZON' })
  marketplace: string = '';

  @ApiProperty({ example: 'US' })
  country: string = 'US';

  @ApiProperty({ example: ['Electronics'] })
  categories: string[] = [];

  @ApiProperty({ example: ['wireless earbuds', 'bluetooth speaker'] })
  keywords: string[] = [];

  @ApiProperty({ enum: DiscoveryMode, example: DiscoveryMode.KEYWORD })
  mode: DiscoveryMode = DiscoveryMode.KEYWORD;

  @ApiProperty({ enum: DiscoverySessionStatus, example: DiscoverySessionStatus.PENDING })
  status: DiscoverySessionStatus = DiscoverySessionStatus.PENDING;

  @ApiProperty({ example: 12 })
  totalDiscovered: number = 0;

  @ApiProperty({
    example: 8,
    description:
      'Newly discovered MarketplaceProductCandidate rows this run — the correct field to use. Discovery no longer auto-creates Opportunity records.',
  })
  newCandidates: number = 0;

  /** @deprecated Same value as `newCandidates`, under the pre-Prompt-4 name — kept only for existing API consumers. Do not treat as a count of created Opportunities. */
  @ApiProperty({
    example: 8,
    description:
      'Deprecated — identical value to `newCandidates`. Kept for historical API compatibility only; new/updated consumers should read `newCandidates`.',
  })
  newOpportunities: number = 0;

  @ApiProperty({ example: 4 })
  duplicatesSkipped: number = 0;

  @ApiPropertyOptional({ example: null, nullable: true })
  errorMessage: string | null = null;

  @ApiPropertyOptional({ example: '2026-07-14T10:01:00.000Z', nullable: true })
  startedAt: string | null = null;

  @ApiPropertyOptional({ example: '2026-07-14T10:05:00.000Z', nullable: true })
  completedAt: string | null = null;

  @ApiProperty({ example: '2026-07-14T10:00:00.000Z' })
  createdAt: string = '';

  @ApiProperty({ example: '2026-07-14T10:05:00.000Z' })
  updatedAt: string = '';
}

export class DiscoverySessionListResponseDto {
  @ApiProperty({ type: [DiscoverySessionResponseDto] })
  items: DiscoverySessionResponseDto[] = [];

  @ApiProperty({ example: 10 })
  total: number = 0;

  @ApiProperty({ example: 1 })
  page: number = 1;

  @ApiProperty({ example: 20 })
  limit: number = 20;
}
