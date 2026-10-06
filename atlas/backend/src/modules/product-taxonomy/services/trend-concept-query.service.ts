import { Injectable } from '@nestjs/common';
import { CategoryRepository } from '../repositories/category.repository';
import { ProductConceptRepository } from '../repositories/product-concept.repository';
import { TrendSignalRepository } from '../repositories/trend-signal.repository';
import {
  TrendSignalClassification,
  TrendSignalSubjectType,
  TREND_SIGNAL_TYPES,
  type ITrendSignal,
} from '../interfaces';

export type TrendConceptEvidenceState = 'EMERGING_NEEDS_VALIDATION' | 'TREND_CANDIDATE';

export interface ITrendConceptSummary {
  conceptId: string;
  conceptName: string;
  categoryId: string | null;
  categoryName: string | null;
  /**
   * Evidence-driven, not a score: EMERGING_NEEDS_VALIDATION = attention
   * evidence only; TREND_CANDIDATE = attention corroborated by an
   * independent search-demand signal. Never "Trending" on one signal alone.
   */
  state: TrendConceptEvidenceState;
  attentionSignal: {
    source: string;
    classification: TrendSignalClassification;
    value: number | null;
    unit: string | null;
    capturedAt: Date;
    rawPayload: Record<string, unknown> | null;
  } | null;
  searchDemandSignal: {
    source: string;
    classification: TrendSignalClassification;
    value: number | null;
    unit: string | null;
    capturedAt: Date;
    rawPayload: Record<string, unknown> | null;
  } | null;
}

/**
 * TrendConceptQueryService
 *
 * Read-side only — ranks ProductConcepts by their latest real ATTENTION
 * signal and reports whichever independent signals actually exist. Never
 * computes or stores a composite score; "state" is a direct function of
 * which signal types are present, nothing else.
 */
@Injectable()
export class TrendConceptQueryService {
  constructor(
    private readonly productConceptRepository: ProductConceptRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly trendSignalRepository: TrendSignalRepository,
  ) {}

  async listTrendingConcepts(limit: number): Promise<ITrendConceptSummary[]> {
    const [attentionSignals, demandSignals] = await Promise.all([
      this.trendSignalRepository.findAllByTypeAndClassification(
        TREND_SIGNAL_TYPES.ATTENTION,
        TrendSignalClassification.RAW_PROVIDER,
      ),
      this.trendSignalRepository.findAllByTypeAndClassification(
        TREND_SIGNAL_TYPES.SEARCH_DEMAND,
        TrendSignalClassification.RAW_PROVIDER,
      ),
    ]);

    const latestAttentionByConcept = this.latestPerSubject(attentionSignals);
    const latestDemandByConcept = this.latestPerSubject(demandSignals);

    const ranked = [...latestAttentionByConcept.entries()]
      .sort(([, a], [, b]) => (b.value ?? -Infinity) - (a.value ?? -Infinity))
      .slice(0, limit);

    const summaries: ITrendConceptSummary[] = [];
    for (const [conceptId, attentionSignal] of ranked) {
      const concept = await this.productConceptRepository.findById(conceptId);
      if (!concept) continue; // signal outlived its concept (shouldn't normally happen); skip rather than error the whole list

      const category = concept.categoryId ? await this.categoryRepository.findById(concept.categoryId) : null;
      const demandSignal = latestDemandByConcept.get(conceptId) ?? null;

      summaries.push({
        conceptId: concept.id,
        conceptName: concept.name,
        categoryId: category?.id ?? null,
        categoryName: category?.name ?? null,
        state: demandSignal ? 'TREND_CANDIDATE' : 'EMERGING_NEEDS_VALIDATION',
        attentionSignal: this.toEvidenceView(attentionSignal),
        searchDemandSignal: this.toEvidenceView(demandSignal),
      });
    }

    return summaries;
  }

  // ── Private ───────────────────────────────────────────────────

  /** Signals arrive newest-first; keeping only the first occurrence per subjectId yields the latest signal per concept. */
  private latestPerSubject(signals: ITrendSignal[]): Map<string, ITrendSignal> {
    const map = new Map<string, ITrendSignal>();
    for (const signal of signals) {
      if (signal.subjectType !== TrendSignalSubjectType.PRODUCT_CONCEPT) continue;
      if (!map.has(signal.subjectId)) map.set(signal.subjectId, signal);
    }
    return map;
  }

  private toEvidenceView(signal: ITrendSignal | null) {
    if (!signal) return null;
    return {
      source: signal.source,
      classification: signal.classification,
      value: signal.value,
      unit: signal.unit,
      capturedAt: signal.capturedAt,
      rawPayload: signal.rawPayload,
    };
  }
}
