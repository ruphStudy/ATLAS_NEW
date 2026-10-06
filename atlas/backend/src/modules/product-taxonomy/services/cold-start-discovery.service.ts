import { Injectable, Logger } from '@nestjs/common';
import { TREND_DISCOVERY_CONSTANTS } from '../constants';
import {
  TrendSignalClassification,
  TrendSignalSubjectType,
  TREND_SIGNAL_TYPES,
  type ITrendSignal,
} from '../interfaces';
import { CategoryRepository } from '../repositories/category.repository';
import { ProductConceptRepository } from '../repositories/product-concept.repository';
import { TrendSignalRepository } from '../repositories/trend-signal.repository';
import { WikipediaTrendProvider } from '../providers/wikipedia-trend.provider';
import { GoogleSearchDemandProvider } from '../providers/google-search-demand.provider';

export interface IColdStartRunResult {
  conceptsProcessed: number;
  /** Concepts that received at least one newly-written RAW_PROVIDER signal this run. */
  conceptsWithNewEvidence: number;
  /** Concepts where nothing new was written — already-fresh signal, or no evidence obtainable. */
  conceptsSkippedOrUnavailable: number;
  searchDemandAvailable: boolean;
}

/**
 * ColdStartDiscoveryService
 *
 * Orchestrates TREND_COLD_START: seed categories → Wikipedia concept
 * discovery → ATTENTION evidence (always) → SEARCH_DEMAND evidence (only
 * if a validation provider is actually configured) → persists Category /
 * ProductConcept / TrendSignal. Never creates a MarketplaceProductCandidate
 * or Opportunity — this stays entirely marketplace-neutral (Prompt 6 §5).
 */
@Injectable()
export class ColdStartDiscoveryService {
  private readonly logger = new Logger(ColdStartDiscoveryService.name);

  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly productConceptRepository: ProductConceptRepository,
    private readonly trendSignalRepository: TrendSignalRepository,
    private readonly wikipediaProvider: WikipediaTrendProvider,
    private readonly searchDemandProvider: GoogleSearchDemandProvider,
  ) {}

  async run(): Promise<IColdStartRunResult> {
    const seedCategories = TREND_DISCOVERY_CONSTANTS.SEED_CATEGORIES;
    const searchDemandAvailable = this.searchDemandProvider.isConfigured();

    const candidates = await this.wikipediaProvider.discoverConcepts(
      seedCategories,
      TREND_DISCOVERY_CONSTANTS.MAX_CATEGORY_LEVELS,
    );

    this.logger.log(
      `Cold-start discovery: ${candidates.length} candidate concepts from ${seedCategories.length} seed categories (search-demand ${searchDemandAvailable ? 'available' : 'unavailable'})`,
    );

    let conceptsWithNewEvidence = 0;
    let conceptsSkippedOrUnavailable = 0;

    for (const candidate of candidates) {
      const categoryId = await this.resolveCategoryId(candidate.categoryName, candidate.categoryParentName);
      const concept = await this.productConceptRepository.upsert({
        categoryId,
        name: candidate.name,
        createdFrom: 'TREND_DISCOVERY',
      });

      const existingSignals = await this.trendSignalRepository.findBySubject(
        TrendSignalSubjectType.PRODUCT_CONCEPT,
        concept.id,
      );

      let wroteNewSignal = false;

      if (!this.hasFreshSignal(existingSignals, TREND_SIGNAL_TYPES.ATTENTION)) {
        const evidence = await this.wikipediaProvider.getAttentionEvidence(candidate.name);
        if (evidence) {
          await this.trendSignalRepository.create({
            subjectType: TrendSignalSubjectType.PRODUCT_CONCEPT,
            subjectId: concept.id,
            signalType: TREND_SIGNAL_TYPES.ATTENTION,
            source: this.wikipediaProvider.source,
            classification: TrendSignalClassification.RAW_PROVIDER,
            value: evidence.value,
            unit: evidence.unit,
            rawPayload: evidence.rawPayload,
            capturedAt: evidence.capturedAt,
          });
          wroteNewSignal = true;
        }
      }

      if (searchDemandAvailable && !this.hasFreshSignal(existingSignals, TREND_SIGNAL_TYPES.SEARCH_DEMAND)) {
        try {
          const demand = await this.searchDemandProvider.getSearchDemandEvidence(candidate.name);
          if (demand) {
            await this.trendSignalRepository.create({
              subjectType: TrendSignalSubjectType.PRODUCT_CONCEPT,
              subjectId: concept.id,
              signalType: TREND_SIGNAL_TYPES.SEARCH_DEMAND,
              source: this.searchDemandProvider.source,
              classification: TrendSignalClassification.RAW_PROVIDER,
              value: demand.value,
              unit: demand.unit,
              rawPayload: demand.rawPayload,
              capturedAt: demand.capturedAt,
            });
            wroteNewSignal = true;
          }
        } catch (err) {
          this.logger.warn(`Search-demand validation failed for "${candidate.name}": ${(err as Error).message}`);
        }
      }

      if (wroteNewSignal) conceptsWithNewEvidence++;
      else conceptsSkippedOrUnavailable++;
    }

    return {
      conceptsProcessed: candidates.length,
      conceptsWithNewEvidence,
      conceptsSkippedOrUnavailable,
      searchDemandAvailable,
    };
  }

  // ── Private ───────────────────────────────────────────────────

  private async resolveCategoryId(categoryName: string, parentName: string | null): Promise<string> {
    if (!parentName) {
      const top = await this.categoryRepository.upsertByName({ name: categoryName, parentId: null, source: 'WIKIPEDIA' });
      return top.id;
    }
    const parent = await this.categoryRepository.upsertByName({ name: parentName, parentId: null, source: 'WIKIPEDIA' });
    const child = await this.categoryRepository.upsertByName({ name: categoryName, parentId: parent.id, source: 'WIKIPEDIA' });
    return child.id;
  }

  private hasFreshSignal(signals: ITrendSignal[], signalType: string): boolean {
    const freshnessMs = TREND_DISCOVERY_CONSTANTS.SIGNAL_FRESHNESS_HOURS * 60 * 60 * 1000;
    const now = Date.now();
    return signals.some(
      (s) =>
        s.signalType === signalType &&
        s.classification === TrendSignalClassification.RAW_PROVIDER &&
        now - s.capturedAt.getTime() < freshnessMs,
    );
  }
}
