import { Injectable } from '@nestjs/common';
import { TaxRepository } from '../repository/tax.repository';
import { TaxValidationIssueType, TaxValidationResult } from '../interfaces';

export interface TaxRuleCandidate {
  ruleKey: string;
  jurisdictionCode: string;
  workspaceId?: string | null;
  rate: number;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
}

/**
 * TaxValidator
 *
 * Validates a rule before it is created/published: rejects invalid rate
 * values and expired windows, and detects conflicting rules — another
 * rule sharing the same key/jurisdiction/workspace whose effective window
 * overlaps the candidate's ("prevent duplicate/conflicting rules").
 */
@Injectable()
export class TaxValidator {
  constructor(private readonly repository: TaxRepository) {}

  async validateRule(candidate: TaxRuleCandidate, excludeId?: string): Promise<TaxValidationResult> {
    const issues: TaxValidationResult['issues'] = [];
    const warnings: string[] = [];

    if (!Number.isFinite(candidate.rate) || candidate.rate < 0) {
      issues.push({
        type: TaxValidationIssueType.INVALID_RULE,
        message: `Tax rate must be a non-negative, finite number (received ${candidate.rate})`,
      });
    }

    if (candidate.effectiveTo && candidate.effectiveTo <= candidate.effectiveFrom) {
      issues.push({
        type: TaxValidationIssueType.INVALID_RULE,
        message: `effectiveTo must be after effectiveFrom`,
      });
    }

    if (candidate.effectiveTo && candidate.effectiveTo < new Date()) {
      warnings.push(`Rule '${candidate.ruleKey}' has an effective window that has already ended`);
    }

    if (issues.length === 0) {
      const overlapping = await this.repository.findOverlappingRules(
        candidate.ruleKey,
        candidate.jurisdictionCode,
        candidate.workspaceId ?? null,
        candidate.effectiveFrom,
        candidate.effectiveTo ?? null,
        excludeId,
      );
      if (overlapping.length > 0) {
        issues.push({
          type: TaxValidationIssueType.CONFLICTING_RULES,
          message: `Rule '${candidate.ruleKey}' overlaps ${overlapping.length} existing rule(s) for jurisdiction '${candidate.jurisdictionCode}' in the same effective window`,
        });
      }
    }

    return { valid: issues.length === 0, issues, warnings };
  }
}
