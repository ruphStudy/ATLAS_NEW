import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TrendSignalClassification } from '../interfaces';

export class TrendSignalEvidenceDto {
  @ApiProperty({ example: 'WIKIPEDIA', description: 'Which provider produced this signal.' })
  source: string = '';

  @ApiProperty({ enum: TrendSignalClassification, example: TrendSignalClassification.RAW_PROVIDER })
  classification: TrendSignalClassification = TrendSignalClassification.RAW_PROVIDER;

  @ApiPropertyOptional({ example: 34.2, nullable: true, description: 'Real measured value — never a fabricated score.' })
  value: number | null = null;

  @ApiPropertyOptional({ example: 'percent_change_30d', nullable: true })
  unit: string | null = null;

  @ApiProperty({ example: '2026-08-27T03:00:00.000Z' })
  capturedAt: string = '';

  @ApiPropertyOptional({ description: 'Raw provider evidence backing `value` — e.g. the daily pageview series.', nullable: true })
  rawPayload: Record<string, unknown> | null = null;
}

export class TrendConceptResponseDto {
  @ApiProperty({ example: 'concept-uuid' })
  conceptId: string = '';

  @ApiProperty({ example: 'Smartwatch' })
  conceptName: string = '';

  @ApiPropertyOptional({ example: 'category-uuid', nullable: true })
  categoryId: string | null = null;

  @ApiPropertyOptional({ example: 'Consumer electronics', nullable: true })
  categoryName: string | null = null;

  @ApiProperty({
    enum: ['EMERGING_NEEDS_VALIDATION', 'TREND_CANDIDATE'],
    example: 'EMERGING_NEEDS_VALIDATION',
    description:
      'EMERGING_NEEDS_VALIDATION = attention evidence only. TREND_CANDIDATE = attention corroborated by an independent search-demand signal. Never labeled "Trending" on one signal alone.',
  })
  state: 'EMERGING_NEEDS_VALIDATION' | 'TREND_CANDIDATE' = 'EMERGING_NEEDS_VALIDATION';

  @ApiPropertyOptional({ type: TrendSignalEvidenceDto, nullable: true })
  attentionSignal: TrendSignalEvidenceDto | null = null;

  @ApiPropertyOptional({
    type: TrendSignalEvidenceDto,
    nullable: true,
    description: 'Null when no search-demand validation provider is configured, or none was corroborated yet — never a fabricated value.',
  })
  searchDemandSignal: TrendSignalEvidenceDto | null = null;
}
