import { Injectable, Logger } from '@nestjs/common';
import {
  ComparisonEngineInput,
  ComparisonRecommendation,
  ComparisonWeights,
  SupplierScoreBreakdown,
} from '../interfaces';
import { QUOTATION_COMPARISON_CONSTANTS } from '../constants';

/**
 * Comparison Engine
 *
 * Pure scoring logic — no I/O, no side effects.
 * Normalises all raw quote values to 0–100 dimension scores
 * then computes a weighted composite comparison score for each supplier.
 */
@Injectable()
export class ComparisonEngine {
  private readonly logger = new Logger(ComparisonEngine.name);

  compare(
    inputs: ComparisonEngineInput[],
    rawWeights?: Partial<ComparisonWeights>,
  ): SupplierScoreBreakdown[] {
    if (!inputs.length) return [];

    const weights = this.resolveWeights(rawWeights);
    const breakdowns = inputs.map((input) =>
      this.buildBreakdown(input, inputs, weights),
    );

    // Rank by comparisonScore descending
    const sorted = [...breakdowns].sort((a, b) => b.comparisonScore - a.comparisonScore);
    sorted.forEach((b, idx) => (b.rank = idx + 1));

    // Restore original order with updated ranks
    return breakdowns;
  }

  // ── Private: weights ─────────────────────────────────────────

  private resolveWeights(overrides?: Partial<ComparisonWeights>): ComparisonWeights {
    const defaults = QUOTATION_COMPARISON_CONSTANTS.DEFAULT_WEIGHTS;
    const raw: ComparisonWeights = {
      unitPrice: overrides?.unitPrice ?? defaults.unitPrice,
      totalCost: overrides?.totalCost ?? defaults.totalCost,
      moq: overrides?.moq ?? defaults.moq,
      leadTime: overrides?.leadTime ?? defaults.leadTime,
      paymentTerms: overrides?.paymentTerms ?? defaults.paymentTerms,
      shippingTerms: overrides?.shippingTerms ?? defaults.shippingTerms,
      certifications: overrides?.certifications ?? defaults.certifications,
      verificationScore: overrides?.verificationScore ?? defaults.verificationScore,
      riskScore: overrides?.riskScore ?? defaults.riskScore,
      performanceScore: overrides?.performanceScore ?? defaults.performanceScore,
    };

    const total = Object.values(raw).reduce((s, v) => s + v, 0);
    if (total === 0) return { ...defaults } as ComparisonWeights;

    return Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, v / total]),
    ) as unknown as ComparisonWeights;
  }

  // ── Private: per-supplier breakdown ──────────────────────────

  private buildBreakdown(
    input: ComparisonEngineInput,
    all: ComparisonEngineInput[],
    weights: ComparisonWeights,
  ): SupplierScoreBreakdown {
    const prices = all.map((i) => i.quotedUnitPrice).filter((p): p is number => p !== null);
    const moqs = all.map((i) => i.quotedMoq).filter((m): m is number => m !== null);
    const leads = all.map((i) => i.quotedLeadTimeDays).filter((l): l is number => l !== null);

    const quotedTotalCost =
      input.quotedUnitPrice !== null ? input.quotedUnitPrice * input.quotedQuantity : null;
    const totalCosts = all
      .map((i) => (i.quotedUnitPrice !== null ? i.quotedUnitPrice * i.quotedQuantity : null))
      .filter((c): c is number => c !== null);

    // -- dimension scores -------------------------------------------------------
    const unitPriceScore = this.invertedMinMax(input.quotedUnitPrice, prices);
    const totalCostScore = this.invertedMinMax(quotedTotalCost, totalCosts);
    const moqScore = this.invertedMinMax(input.quotedMoq, moqs);
    const leadTimeScore = this.invertedMinMax(input.quotedLeadTimeDays, leads);
    const paymentTermsScore = this.scorePaymentTerms(input.paymentTerms);
    const shippingTermsScore = this.scoreShippingTerms(input.shippingTerms);
    const certificationsScore = this.scoreCertifications(input.certifications);
    const verificationScoreNorm = input.verificationScore ?? 50;
    // Risk is inverted: lower risk → higher score
    const riskScoreNorm = input.riskScore !== null ? Math.max(0, 100 - input.riskScore) : 50;
    const performanceScoreNorm = input.performanceScore ?? 50;

    // -- weighted composite -----------------------------------------------------
    const comparisonScore = this.round(
      unitPriceScore * weights.unitPrice +
        totalCostScore * weights.totalCost +
        moqScore * weights.moq +
        leadTimeScore * weights.leadTime +
        paymentTermsScore * weights.paymentTerms +
        shippingTermsScore * weights.shippingTerms +
        certificationsScore * weights.certifications +
        verificationScoreNorm * weights.verificationScore +
        riskScoreNorm * weights.riskScore +
        performanceScoreNorm * weights.performanceScore,
    );

    const recommendation = this.deriveRecommendation(comparisonScore);

    this.logger.debug(
      `Supplier ${input.supplierId}: comparisonScore=${comparisonScore} recommendation=${recommendation}`,
    );

    return {
      supplierId: input.supplierId,
      rfqSupplierId: input.rfqSupplierId,
      providerCode: input.providerCode,
      providerQuotationRef: input.providerQuotationRef,
      quotedUnitPrice: input.quotedUnitPrice,
      quotedTotalCost,
      quotedMoq: input.quotedMoq,
      quotedLeadTimeDays: input.quotedLeadTimeDays,
      paymentTerms: input.paymentTerms,
      shippingTerms: input.shippingTerms,
      certifications: input.certifications,
      verificationScore: input.verificationScore,
      riskScore: input.riskScore,
      performanceScore: input.performanceScore,
      unitPriceScore: this.round(unitPriceScore),
      totalCostScore: this.round(totalCostScore),
      moqScore: this.round(moqScore),
      leadTimeScore: this.round(leadTimeScore),
      paymentTermsScore: this.round(paymentTermsScore),
      shippingTermsScore: this.round(shippingTermsScore),
      certificationsScore: this.round(certificationsScore),
      verificationScoreNorm: this.round(verificationScoreNorm),
      riskScoreNorm: this.round(riskScoreNorm),
      performanceScoreNorm: this.round(performanceScoreNorm),
      comparisonScore,
      recommendation,
      rank: 0, // filled after sort
    };
  }

  // ── Normalisation helpers ─────────────────────────────────────

  /**
   * Min-max normalisation where the LOWEST value is BEST (e.g. price, lead-time).
   * Returns 50 when value is absent or all values are equal.
   */
  private invertedMinMax(value: number | null, pool: number[]): number {
    if (value === null || pool.length === 0) return 50;
    const min = Math.min(...pool);
    const max = Math.max(...pool);
    if (max === min) return 100; // only one data point — full score
    return 100 - ((value - min) / (max - min)) * 100;
  }

  private scorePaymentTerms(terms: string | null): number {
    if (!terms) return 50;
    const key = terms.toUpperCase().replace(/\s/g, '');
    return QUOTATION_COMPARISON_CONSTANTS.PAYMENT_TERMS_SCORES[key] ?? 50;
  }

  private scoreShippingTerms(terms: string | null): number {
    if (!terms) return 50;
    const key = terms.toUpperCase().replace(/\s/g, '');
    return QUOTATION_COMPARISON_CONSTANTS.SHIPPING_TERMS_SCORES[key] ?? 50;
  }

  private scoreCertifications(certs: string[]): number {
    // Each certification adds incremental value; cap at 100
    const baseScore = Math.min(certs.length * 20, 100);
    return baseScore;
  }

  // ── Recommendation ────────────────────────────────────────────

  private deriveRecommendation(score: number): ComparisonRecommendation {
    const t = QUOTATION_COMPARISON_CONSTANTS.RECOMMENDATION_THRESHOLDS;
    if (score >= t.STRONGLY_RECOMMENDED) return ComparisonRecommendation.STRONGLY_RECOMMENDED;
    if (score >= t.RECOMMENDED) return ComparisonRecommendation.RECOMMENDED;
    if (score >= t.ACCEPTABLE) return ComparisonRecommendation.ACCEPTABLE;
    return ComparisonRecommendation.NOT_RECOMMENDED;
  }

  private round(n: number): number {
    return Math.round(n * 100) / 100;
  }
}
