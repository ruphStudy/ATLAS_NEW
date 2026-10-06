import { Module } from '@nestjs/common';
import { CategoryRepository } from './repositories/category.repository';
import { ProductConceptRepository } from './repositories/product-concept.repository';
import { TrendSignalRepository } from './repositories/trend-signal.repository';
import { WikipediaTrendProvider } from './providers/wikipedia-trend.provider';
import { GoogleSearchDemandProvider } from './providers/google-search-demand.provider';
import { ColdStartDiscoveryService } from './services/cold-start-discovery.service';
import { TrendConceptQueryService } from './services/trend-concept-query.service';
import { ProductTaxonomyController } from './product-taxonomy.controller';

/**
 * ProductTaxonomyModule
 *
 * Domain foundation (Category, ProductConcept, TrendSignal) plus the
 * marketplace-neutral trend-discovery layer built on top of it (Prompt 6):
 * WikipediaTrendProvider (real, ATTENTION-only concept discovery) and
 * GoogleSearchDemandProvider (a clean config boundary — no Google Ads
 * credentials exist, so it always reports "unavailable" today).
 * ColdStartDiscoveryService is consumed by DiscoveryProcessor for the
 * TREND_COLD_START mode; TrendConceptQueryService backs the read-only
 * `GET /product-taxonomy/trending-concepts` endpoint.
 */
@Module({
  controllers: [ProductTaxonomyController],
  providers: [
    CategoryRepository,
    ProductConceptRepository,
    TrendSignalRepository,
    WikipediaTrendProvider,
    GoogleSearchDemandProvider,
    ColdStartDiscoveryService,
    TrendConceptQueryService,
  ],
  exports: [
    CategoryRepository,
    ProductConceptRepository,
    TrendSignalRepository,
    ColdStartDiscoveryService,
  ],
})
export class ProductTaxonomyModule {}
