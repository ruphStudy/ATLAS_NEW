import { Injectable, Logger } from '@nestjs/common';
import {
  ScoreInputs,
  ScoringWeights,
  ScoringResult,
  Recommendation,
  RiskLevel,
  ConfidenceLevel,
} from '../interfaces';
import { SCORING_CONSTANTS } from '../constants';

/**
 * Scoring Engine
 *
 * Pure scoring logic — no I/O, no side effects.
 * Accepts raw sub-scores and configurable weights;
 * returns the fully computed ScoringResult.
 */
@Injectable()
export class ScoringEngine {
  private readonly logger = new Logger(ScoringEngine.name);

  compute(inputs: ScoreInputs, weights?: Partial<ScoringWeights>): ScoringResult {
    const resolvedWeights = this.resolveWeights(weights);
    const presentScores = this.presentScores(inputs);
    const inputCount = presentScores.length;

    // Weighted average over available scores only (re-normalise weights)
    const finalScore = this.computeWeightedScore(inputs, resolvedWeights);

    const recommendation = this.deriveRecommendation(finalScore);
    const riskLevel = this.deriveRiskLevel(inputs, finalScore);
    const { confidenceLevel, confidenceScore } = this.deriveConfidence(inputCount, inputs);
    const strengths = this.deriveStrengths(inputs);
    const weaknesses = this.deriveWeaknesses(inputs);

    this.logger.debug(
      `Scoring result: final=${finalScore} recommendation=${recommendation} risk=${riskLevel}`,
    );

    return {
      finalScore,
      demandScore: inputs.demandScore ?? null,
      competitionScore: inputs.competitionScore ?? null,
      profitScore: inputs.profitScore ?? null,
      supplierScore: inputs.supplierScore ?? null,
      weights: resolvedWeights,
      recommendation,
      confidenceLevel,
      confidenceScore,
      strengths,
      weaknesses,
      riskLevel,
      inputCount,
    };
  }

  // ── Private: weights ─────────────────────────────────────────

  private resolveWeights(overrides?: Partial<ScoringWeights>): ScoringWeights {
    const raw = {
      demand: overrides?.demand ?? SCORING_CONSTANTS.DEFAULT_WEIGHTS.DEMAND,
      competition: overrides?.competition ?? SCORING_CONSTANTS.DEFAULT_WEIGHTS.COMPETITION,
      profit: overrides?.profit ?? SCORING_CONSTANTS.DEFAULT_WEIGHTS.PROFIT,
      supplier: overrides?.supplier ?? SCORING_CONSTANTS.DEFAULT_WEIGHTS.SUPPLIER,
    };

    const total = raw.demand + raw.competition + raw.profit + raw.supplier;
    if (total === 0) {
      return {
        demand: SCORING_CONSTANTS.DEFAULT_WEIGHTS.DEMAND,
        competition: SCORING_CONSTANTS.DEFAULT_WEIGHTS.COMPETITION,
        profit: SCORING_CONSTANTS.DEFAULT_WEIGHTS.PROFIT,
        supplier: SCORING_CONSTANTS.DEFAULT_WEIGHTS.SUPPLIER,
      };
    }

    // Normalise to sum = 1
    return {
      demand: raw.demand / total,
      competition: raw.competition / total,
      profit: raw.profit / total,
      supplier: raw.supplier / total,
    };
  }

  // ── Private: score computation ───────────────────────────────

  private computeWeightedScore(inputs: ScoreInputs, weights: ScoringWeights): number {
    const pairs: Array<{ score: number | null | undefined; weight: number }> = [
      { score: inputs.demandScore, weight: weights.demand },
      // Competition score: invert (lower competition = better opportunity)
      {
        score: inputs.competitionScore != null ? 100 - inputs.competitionScore : null,
        weight: weights.competition,
      },
      { score: inputs.profitScore, weight: weights.profit },
      { score: inputs.supplierScore, weight: weights.supplier },
    ];

    const available = pairs.filter((p) => p.score != null && p.score >= 0);
    if (available.length === 0) return 0;

    const weightSum = available.reduce((s, p) => s + p.weight, 0);
    if (weightSum === 0) return 0;

    const weighted = available.reduce((s, p) => s + (p.score as number) * p.weight, 0);
    const score = weighted / weightSum;

    return Math.round(Math.min(100, Math.max(0, score)) * 10) / 10;
  }

  // ── Private: derived fields ──────────────────────────────────

  private deriveRecommendation(finalScore: number): Recommendation {
    if (finalScore >= SCORING_CONSTANTS.BUY_THRESHOLD) return Recommendation.BUY;
    if (finalScore >= SCORING_CONSTANTS.REVIEW_THRESHOLD) return Recommendation.REVIEW;
    return Recommendation.REJECT;
  }

  private deriveRiskLevel(inputs: ScoreInputs, finalScore: number): RiskLevel {
    // High competition + low profit = high risk regardless of final score
    const highCompetition =
      inputs.competitionScore != null && inputs.competitionScore >= 70;
    const lowProfit =
      inputs.profitScore != null && inputs.profitScore < 30;

    if (highCompetition && lowProfit) return RiskLevel.HIGH;
    if (finalScore >= SCORING_CONSTANTS.LOW_RISK_THRESHOLD) return RiskLevel.LOW;
    if (finalScore >= SCORING_CONSTANTS.MEDIUM_RISK_THRESHOLD) return RiskLevel.MEDIUM;
    return RiskLevel.HIGH;
  }

  private deriveConfidence(
    inputCount: number,
    inputs: ScoreInputs,
  ): { confidenceLevel: ConfidenceLevel; confidenceScore: number } {
    // Base: 25 pts per available input
    const base = Math.min(100, inputCount * 25);

    // Bonus: scores not at extremes (more reliable)
    const scores = [
      inputs.demandScore,
      inputs.competitionScore,
      inputs.profitScore,
      inputs.supplierScore,
    ].filter((s): s is number => s != null);

    const nonExtreme = scores.filter((s) => s > 5 && s < 95).length;
    const bonus = nonExtreme * 3;

    const confidenceScore = Math.min(100, base + bonus);

    let confidenceLevel: ConfidenceLevel;
    if (confidenceScore >= 80) confidenceLevel = ConfidenceLevel.HIGH;
    else if (confidenceScore >= 50) confidenceLevel = ConfidenceLevel.MEDIUM;
    else confidenceLevel = ConfidenceLevel.LOW;

    return { confidenceLevel, confidenceScore };
  }

  private deriveStrengths(inputs: ScoreInputs): string[] {
    const strengths: string[] = [];
    if (inputs.demandScore != null && inputs.demandScore >= 70) strengths.push('Strong market demand');
    if (inputs.competitionScore != null && inputs.competitionScore <= 40) strengths.push('Low competition environment');
    if (inputs.profitScore != null && inputs.profitScore >= 70) strengths.push('High profit potential');
    if (inputs.supplierScore != null && inputs.supplierScore >= 70) strengths.push('Reliable supplier ecosystem');
    if (inputs.demandScore != null && inputs.demandScore >= 85) strengths.push('Exceptional demand signals');
    if (inputs.profitScore != null && inputs.profitScore >= 85) strengths.push('Exceptional margin profile');
    return strengths;
  }

  private deriveWeaknesses(inputs: ScoreInputs): string[] {
    const weaknesses: string[] = [];
    if (inputs.demandScore != null && inputs.demandScore < 40) weaknesses.push('Weak or declining demand');
    if (inputs.competitionScore != null && inputs.competitionScore >= 70) weaknesses.push('Highly competitive market');
    if (inputs.profitScore != null && inputs.profitScore < 40) weaknesses.push('Low profit margins');
    if (inputs.supplierScore != null && inputs.supplierScore < 40) weaknesses.push('Limited or low-quality suppliers');
    if (inputs.competitionScore != null && inputs.competitionScore >= 85) weaknesses.push('Market saturation risk');
    if (inputs.profitScore != null && inputs.profitScore < 20) weaknesses.push('Negative or break-even profitability');
    return weaknesses;
  }

  private presentScores(inputs: ScoreInputs): string[] {
    return Object.entries(inputs)
      .filter(([, v]) => v != null)
      .map(([k]) => k);
  }
}
