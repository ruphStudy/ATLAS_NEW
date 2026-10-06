import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TrendConceptQueryService } from './services/trend-concept-query.service';
import { TrendingConceptsQueryDto } from './dto/trending-concepts-query.dto';
import { TrendConceptResponseDto } from './dto/trending-concept-response.dto';
import type { ITrendConceptSummary } from './services/trend-concept-query.service';

/**
 * ProductTaxonomyController
 *
 * Read-only. Category/ProductConcept/TrendSignal are global/shared, not
 * workspace-scoped (Prompt 3 §5.A) — every authenticated user sees the
 * same evidence, since it describes real-world attention/demand, not a
 * workspace's private data. Nothing here triggers a provider call; it
 * only reads whatever a TREND_COLD_START discovery session has already
 * persisted.
 */
@ApiTags('Product Taxonomy')
@ApiBearerAuth('access-token')
@Controller({ path: 'product-taxonomy', version: '1' })
export class ProductTaxonomyController {
  constructor(private readonly trendConceptQueryService: TrendConceptQueryService) {}

  @Get('trending-concepts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List product concepts ranked by real attention evidence',
    description:
      'Returns ProductConcepts discovered via cold-start trend discovery, ranked by their latest real ATTENTION signal (Wikipedia pageview growth). Each entry reports its actual evidence and an evidence-driven state — never a fabricated score, never labeled "Trending" on attention alone.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: [TrendConceptResponseDto] })
  async listTrendingConcepts(@Query() query: TrendingConceptsQueryDto): Promise<TrendConceptResponseDto[]> {
    const summaries = await this.trendConceptQueryService.listTrendingConcepts(query.limit ?? 20);
    return summaries.map((s) => this.toResponseDto(s));
  }

  private toResponseDto(s: ITrendConceptSummary): TrendConceptResponseDto {
    return {
      conceptId: s.conceptId,
      conceptName: s.conceptName,
      categoryId: s.categoryId,
      categoryName: s.categoryName,
      state: s.state,
      attentionSignal: s.attentionSignal
        ? { ...s.attentionSignal, capturedAt: s.attentionSignal.capturedAt.toISOString() }
        : null,
      searchDemandSignal: s.searchDemandSignal
        ? { ...s.searchDemandSignal, capturedAt: s.searchDemandSignal.capturedAt.toISOString() }
        : null,
    };
  }
}
