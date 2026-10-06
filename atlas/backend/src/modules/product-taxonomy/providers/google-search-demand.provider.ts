import { Injectable, Logger } from '@nestjs/common';
import type { ISearchDemandEvidence, ISearchDemandProvider } from '../interfaces';
import { describeMissingGoogleAdsConfig, isGoogleAdsConfigured } from './google-ads.config';

/**
 * GoogleSearchDemandProvider (Keyword Planner)
 *
 * Real SEARCH_DEMAND validation for a ProductConcept — but only ever runs
 * with real Google Ads API credentials. This codebase has none configured
 * today (see google-ads.config.ts), so this provider is a clean,
 * side-effect-free "unavailable" boundary: `isConfigured()` is false,
 * callers must treat that as "validation unavailable" and skip
 * SEARCH_DEMAND for every concept. It never fakes a search-volume number
 * and never makes a network call while unconfigured.
 */
@Injectable()
export class GoogleSearchDemandProvider implements ISearchDemandProvider {
  private readonly logger = new Logger(GoogleSearchDemandProvider.name);
  readonly source = 'GOOGLE_KEYWORD_PLANNER';

  isConfigured(): boolean {
    return isGoogleAdsConfigured();
  }

  async getSearchDemandEvidence(conceptName: string): Promise<ISearchDemandEvidence | null> {
    if (!this.isConfigured()) {
      this.logger.debug(
        `Google Ads not configured (missing: ${describeMissingGoogleAdsConfig().join(', ')}) — skipping SEARCH_DEMAND for "${conceptName}".`,
      );
      return null;
    }

    // Real credentials exist but the Google Ads API client itself is not
    // wired up yet — this is intentionally NOT a silent no-op: it fails
    // loudly rather than ever returning a fabricated number once someone
    // configures credentials but before the client call is implemented.
    throw new Error(
      'GOOGLE_ADS_* credentials are configured, but the Google Ads API client call is not implemented yet. ' +
        'Implement the KeywordPlanIdeaService request here before enabling this path.',
    );
  }
}
