import { Injectable } from '@nestjs/common';
import {
  DefectDetail,
  DefectSeverity,
  ChecklistItem,
  InspectionRecommendation,
  QualityInspectionStatus,
} from '../interfaces';
import { INSPECTION_CONSTANTS } from '../constants';

interface ScoreInput {
  quantityInspected: number;
  quantityPassed: number;
  quantityFailed: number;
  defects: DefectDetail[];
  checklist: ChecklistItem[];
}

@Injectable()
export class QualityScoreEngine {
  /**
   * Calculates quality score (0–100) and recommendation.
   * Weights:
   *   - Pass rate         : 50%
   *   - Defect severity   : 30%
   *   - Checklist rate    : 20%
   */
  calculate(input: ScoreInput): {
    qualityScore: number;
    recommendation: InspectionRecommendation;
    finalStatus: QualityInspectionStatus;
  } {
    const passRate = this.calcPassRate(input);
    const defectScore = this.calcDefectScore(input.defects, input.quantityInspected);
    const checklistScore = this.calcChecklistScore(input.checklist);

    const qualityScore = Math.round(
      passRate * 0.5 + defectScore * 0.3 + checklistScore * 0.2,
    );

    const clampedScore = Math.max(0, Math.min(100, qualityScore));

    const { recommendation, finalStatus } = this.deriveRecommendation(
      clampedScore,
      input.defects,
    );

    return { qualityScore: clampedScore, recommendation, finalStatus };
  }

  private calcPassRate(input: ScoreInput): number {
    if (input.quantityInspected === 0) return 0;
    return (input.quantityPassed / input.quantityInspected) * 100;
  }

  private calcDefectScore(defects: DefectDetail[], quantityInspected: number): number {
    if (defects.length === 0) return 100;
    if (quantityInspected === 0) return 0;

    const hasCritical = defects.some((d) => d.severity === DefectSeverity.CRITICAL);
    if (hasCritical) return 0;

    const hasMajor = defects.some((d) => d.severity === DefectSeverity.MAJOR);
    const totalDefective = defects.reduce((s, d) => s + d.quantity, 0);
    const defectRate = totalDefective / quantityInspected;

    if (hasMajor) return Math.max(0, 50 - defectRate * 100);
    return Math.max(0, 100 - defectRate * 100);
  }

  private calcChecklistScore(checklist: ChecklistItem[]): number {
    if (checklist.length === 0) return 100;
    const passed = checklist.filter((c) => c.passed).length;
    return (passed / checklist.length) * 100;
  }

  private deriveRecommendation(
    score: number,
    defects: DefectDetail[],
  ): { recommendation: InspectionRecommendation; finalStatus: QualityInspectionStatus } {
    const hasCritical = defects.some((d) => d.severity === DefectSeverity.CRITICAL);

    if (hasCritical || score < 40) {
      return {
        recommendation: InspectionRecommendation.REJECT,
        finalStatus: QualityInspectionStatus.FAILED,
      };
    }

    if (score < INSPECTION_CONSTANTS.PASS_THRESHOLD) {
      return {
        recommendation: InspectionRecommendation.CONDITIONALLY_APPROVE,
        finalStatus: QualityInspectionStatus.CONDITIONAL_APPROVAL,
      };
    }

    if (score < 85) {
      return {
        recommendation: InspectionRecommendation.APPROVE,
        finalStatus: QualityInspectionStatus.PASSED,
      };
    }

    return {
      recommendation: InspectionRecommendation.APPROVE,
      finalStatus: QualityInspectionStatus.PASSED,
    };
  }
}
