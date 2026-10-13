import { Injectable, Logger } from '@nestjs/common';
import { ConfigurationService } from '@config/configuration.service';
import { AmazonAdapter as RealAmazonAdapter } from '@modules/marketplace-adapter/adapters/amazon/amazon.adapter';
import { AmazonAuthError } from '@modules/marketplace-adapter/adapters/amazon/auth/amazon-auth.service';
import { classifyAmazonAuthFailure } from '@modules/marketplace-adapter/adapters/amazon/auth/amazon-auth-error.classifier';
import { composeAmazonSandboxCredentials } from '@modules/marketplace-adapter/adapters/amazon/amazon-credentials.composer';
import { AmazonMarketplace } from '@modules/marketplace-adapter/adapters/amazon/interfaces/amazon.interfaces';
import { MARKETPLACE_CODES, SUPPORTED_COUNTRIES } from '../../constants';
import type {
  IDiscoveredProduct,
  IMarketplaceAdapter,
  IMarketplaceAdapterDiscoverParams,
} from '../../interfaces';

/**
 * AmazonAdapter (Discovery)
 *
 * Real Amazon SP-API Catalog Items integration for Product Discovery — no
 * synthetic/fake results. Reuses the existing marketplace-adapter Amazon
 * infrastructure entirely (AmazonSpApiClient, AmazonAuthService, request/
 * response mappers, sandbox/production endpoint selection, error
 * classification) via `RealAmazonAdapter.searchCatalogItems()`; this file
 * adds no HTTP client, no auth logic, and no Amazon endpoint of its own.
 *
 * Always runs on the dedicated SANDBOX app (AMAZON_SP_API_SANDBOX_CLIENT_ID/
 * SECRET + AMAZON_SP_API_SANDBOX_REFRESH_TOKEN) against the sandbox SP-API
 * host, via composeAmazonSandboxCredentials() — no MarketplaceAccount, no
 * seller OAuth, no DB credential record — regardless of
 * AMAZON_SP_API_ENVIRONMENT.
 *
 * Discovery has no per-seller authorization yet, so it never uses the
 * production/default app: that would mean calling production SP-API without
 * a seller's consent. If the sandbox app is not configured, discovery fails
 * clearly instead of falling back.
 */
@Injectable()
export class AmazonAdapter implements IMarketplaceAdapter {
  private readonly logger = new Logger(AmazonAdapter.name);

  readonly marketplace = MARKETPLACE_CODES.AMAZON;
  readonly supportedCountries: readonly string[] = SUPPORTED_COUNTRIES;

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly realAdapter: RealAmazonAdapter,
  ) {}

  supportsCountry(country: string): boolean {
    return (this.supportedCountries as string[]).includes(country.toUpperCase());
  }

  async *discover(
    params: IMarketplaceAdapterDiscoverParams,
  ): AsyncIterable<IDiscoveredProduct> {
    const { keywords, country, categories, workspaceId } = params;
    const marketplaceCode = `${this.marketplace}_${country.toUpperCase()}`;
    const global = this.configurationService.getAmazonProviderConfig();

    this.logger.debug(
      `Amazon discovery: ${keywords.length} keywords on ${marketplaceCode} [ws: ${workspaceId}, app: sandbox]`,
    );

    const amazonMarketplace = this.resolveAmazonMarketplace(country);
    // Throws a config-only message (no values) if the sandbox app/token is missing.
    const credentials = composeAmazonSandboxCredentials(global, amazonMarketplace);

    for (let i = 0; i < keywords.length; i++) {
      const keyword = keywords[i] as string;
      this.logger.debug(`[${i + 1}/${keywords.length}] Amazon Catalog Items search: "${keyword}"`);

      let items: any[];
      try {
        const result = await this.realAdapter.searchCatalogItems(credentials, {
          keywords: [keyword],
        });
        items = result.items;
      } catch (err) {
        const classified =
          err instanceof AmazonAuthError
            ? { classification: err.classification, reason: err.message }
            : classifyAmazonAuthFailure(err);
        this.logger.error(
          `Amazon Catalog Items search failed for "${keyword}" (${classified.classification}): ${classified.reason}`,
        );
        // Propagate — DiscoveryProcessor's existing try/catch marks the
        // session FAILED with this message. No fallback to synthetic data.
        throw new Error(
          `Amazon Catalog Items search failed for keyword "${keyword}" (${classified.classification}): ${classified.reason}`,
        );
      }

      if (items.length === 0) {
        this.logger.debug(`No Amazon catalog items matched "${keyword}"`);
        continue;
      }

      for (let rank = 0; rank < items.length; rank++) {
        yield this.buildProduct(
          items[rank],
          keyword,
          marketplaceCode,
          country,
          categories?.[0] ?? null,
          rank + 1,
        );
      }
    }
  }

  private buildProduct(
    item: any,
    keyword: string,
    marketplaceCode: string,
    country: string,
    fallbackCategory: string | null,
    rank: number,
  ): IDiscoveredProduct {
    const summary = item.summaries?.[0];
    // ASIN is always present on a real Catalog Items result — a safe,
    // non-fabricated fallback when Amazon returns no summary/title.
    const title: string = summary?.itemName ?? item.asin ?? keyword;
    const brand: string | null = summary?.brand ?? null;
    const productType: string | null = item.productTypes?.[0]?.productType ?? null;
    const category = productType ?? fallbackCategory;
    const image: string | null = item.images?.[0]?.images?.[0]?.link ?? null;

    return {
      keyword,
      marketplace: marketplaceCode,
      country: country.toUpperCase(),
      category,
      title,
      rank,
      // Amazon Catalog Items always returns an ASIN for a real result — the
      // stable external product ID a MarketplaceProductCandidate is keyed
      // on (never the keyword).
      externalProductId: item.asin ?? null,
      // Amazon Catalog Items returns no sales, pricing, or review data —
      // there is no real signal to derive demand/competition/profit/AI
      // scores from. 0 (not a plausible mid-range number) plus the
      // explicit `scoringAvailable: false` flag below make this visibly a
      // placeholder rather than a silently fabricated score.
      estimatedDemandScore: 0,
      estimatedCompetitionScore: 0,
      estimatedProfitScore: 0,
      estimatedAiScore: 0,
      rawData: {
        source: 'amazon_sp_api_catalog_items',
        keyword,
        marketplaceCode,
        country: country.toUpperCase(),
        category,
        title,
        asin: item.asin ?? null,
        brand,
        imageUrl: image,
        identifiers: item.identifiers ?? null,
        images: item.images ?? null,
        productTypes: item.productTypes ?? null,
        salesRanks: item.salesRanks ?? null,
        attributes: item.attributes ?? null,
        scoringAvailable: false,
        scoreNote:
          'Amazon Catalog Items does not return demand/competition/profit/AI signals (no sales, pricing, or review data available). Scores above are placeholder 0, not derived from real data.',
        timestamp: new Date().toISOString(),
        apiVersion: 'catalog-2022-04-01',
      },
    };
  }

  private resolveAmazonMarketplace(country: string): AmazonMarketplace {
    const key = country.toUpperCase() as keyof typeof AmazonMarketplace;
    const marketplace = AmazonMarketplace[key];
    if (!marketplace) {
      throw new Error(`Unsupported Amazon country '${country}' for Catalog Items search`);
    }
    return marketplace;
  }
}
