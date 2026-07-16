import { Injectable, Logger } from '@nestjs/common';
import { MARKETPLACE_CODES, SCORE_WEIGHTS, SUPPORTED_COUNTRIES } from '../../constants';
import type {
  IDiscoveredProduct,
  IMarketplaceAdapter,
  IMarketplaceAdapterDiscoverParams,
} from '../../interfaces';

/**
 * AmazonAdapter
 *
 * Marketplace adapter for Amazon.
 * Currently implemented as a stub that simulates discovery results.
 *
 * Production implementation will use:
 *   - Amazon SP-API (Selling Partner API) for product data
 *   - Amazon Product Advertising API (PA-API) for search results
 *
 * The stub returns realistic score distributions so that the full
 * pipeline (deduplication, opportunity creation, scoring) can be
 * tested and validated end-to-end.
 */
@Injectable()
export class AmazonAdapter implements IMarketplaceAdapter {
  private readonly logger = new Logger(AmazonAdapter.name);

  readonly marketplace = MARKETPLACE_CODES.AMAZON;
  readonly supportedCountries: readonly string[] = SUPPORTED_COUNTRIES;

  supportsCountry(country: string): boolean {
    return (this.supportedCountries as string[]).includes(country.toUpperCase());
  }

  async *discover(
    params: IMarketplaceAdapterDiscoverParams,
  ): AsyncIterable<IDiscoveredProduct> {
    const { keywords, country, categories, workspaceId } = params;
    const marketplaceCode = `AMAZON_${country.toUpperCase()}`;

    this.logger.debug(
      `Amazon discovery: ${keywords.length} keywords on ${marketplaceCode} [ws: ${workspaceId}]`,
    );

    for (let i = 0; i < keywords.length; i++) {
      const keyword = keywords[i] as string;

      this.logger.debug(`[${i + 1}/${keywords.length}] Discovering: "${keyword}"`);

      // Simulate API latency (remove in production)
      await new Promise((resolve) => setTimeout(resolve, 50));

      yield this.buildProduct(keyword, marketplaceCode, country, categories?.[0] ?? null);
    }
  }

  private buildProduct(
    keyword: string,
    marketplaceCode: string,
    country: string,
    category: string | null,
  ): IDiscoveredProduct {
    // Deterministic base score derived from keyword characteristics
    // In production: replace with real API response parsing
    const baseScore = this.deterministicScore(keyword);
    const noise = () => (Math.random() - 0.5) * 10;

    const demand = Math.min(100, Math.max(0, baseScore + 15 + noise()));
    const competition = Math.min(100, Math.max(0, 100 - baseScore + 20 + noise()));
    const profit = Math.min(100, Math.max(0, baseScore - 10 + 20 + noise()));
    const ai = Math.min(100, Math.max(0, baseScore + 5 + noise()));

    return {
      keyword,
      marketplace: marketplaceCode,
      country: country.toUpperCase(),
      category,
      title: `[Amazon ${country}] Best products for: "${keyword}"`,
      rank: 1,
      estimatedDemandScore: Math.round(demand * 100) / 100,
      estimatedCompetitionScore: Math.round(competition * 100) / 100,
      estimatedProfitScore: Math.round(profit * 100) / 100,
      estimatedAiScore: Math.round(ai * 100) / 100,
      rawData: {
        source: 'amazon_sp_api_stub',
        keyword,
        marketplaceCode,
        country: country.toUpperCase(),
        category,
        timestamp: new Date().toISOString(),
        apiVersion: 'stub-v1.0',
        // Production fields (will be populated from real API):
        // asin, title, brand, bsr, reviewCount, reviewRating,
        // price, fbaFees, estimatedMonthlySales, etc.
      },
    };
  }

  /**
   * Produces a deterministic score [0–100] based on keyword properties.
   * Ensures consistent deduplication testing: same keyword → same base score.
   */
  private deterministicScore(keyword: string): number {
    let hash = 0;
    for (let i = 0; i < keyword.length; i++) {
      hash = (hash * 31 + keyword.charCodeAt(i)) & 0xffffff;
    }
    return 30 + (hash % 55); // range [30, 85]
  }
}
