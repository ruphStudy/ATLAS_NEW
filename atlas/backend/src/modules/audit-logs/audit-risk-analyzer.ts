import { Injectable } from '@nestjs/common';
import { AuditLogsRepository } from './audit-logs.repository';
import { RecordAuditLogDto } from './dto';
import { AuditActionCategory, AuditRiskLevel, ActivityOutcome } from './interfaces';
import {
  SUSPICIOUS_ACTIVITY_WINDOW_MS,
  SUSPICIOUS_ACTIVITY_FAILURE_THRESHOLD,
} from './constants';

const RISK_RANK: Record<AuditRiskLevel, number> = {
  [AuditRiskLevel.NORMAL]: 0,
  [AuditRiskLevel.SUSPICIOUS]: 1,
  [AuditRiskLevel.HIGH_RISK]: 2,
};

export interface IAuditRiskAssessment {
  riskLevel: AuditRiskLevel;
  flagged: boolean;
  flagReason?: string;
}

/**
 * Rule-based suspicious/unauthorized/high-risk activity detection — no
 * ML/anomaly-detection infrastructure exists in this codebase, so this
 * applies simple, explainable heuristics against the audit log itself
 * rather than introducing new infra:
 *   1. A failed PERMISSION action is always at least SUSPICIOUS (an
 *      unauthorized access attempt).
 *   2. Repeated failures (>= threshold) for the same actor+action-category
 *      within a short window escalates to SUSPICIOUS (brute-force-like
 *      pattern), regardless of category.
 * Callers may also self-declare a `riskLevel`/`flagReason` on the record
 * DTO (e.g. a module intentionally logging a high-risk configuration
 * change) — this analyzer only ever escalates, never downgrades that.
 */
@Injectable()
export class AuditRiskAnalyzer {
  constructor(private readonly repository: AuditLogsRepository) {}

  async assess(dto: RecordAuditLogDto): Promise<IAuditRiskAssessment> {
    let riskLevel = dto.riskLevel ?? AuditRiskLevel.NORMAL;
    let flagReason = dto.flagReason;

    const isFailure = (dto.outcome ?? ActivityOutcome.SUCCESS) === ActivityOutcome.FAILURE;

    if (isFailure && dto.actionCategory === AuditActionCategory.PERMISSION) {
      riskLevel = this.escalate(riskLevel, AuditRiskLevel.SUSPICIOUS);
      flagReason = flagReason ?? 'Unauthorized permission attempt';
    }

    if (isFailure && dto.actorId) {
      const since = new Date(Date.now() - SUSPICIOUS_ACTIVITY_WINDOW_MS);
      const recentFailures = await this.repository.countRecentFailures(
        dto.workspaceId,
        dto.actorId,
        dto.actionCategory,
        since,
      );

      if (recentFailures + 1 >= SUSPICIOUS_ACTIVITY_FAILURE_THRESHOLD) {
        riskLevel = this.escalate(riskLevel, AuditRiskLevel.SUSPICIOUS);
        flagReason =
          flagReason ??
          `${recentFailures + 1} failed ${dto.actionCategory} attempts within ${Math.round(
            SUSPICIOUS_ACTIVITY_WINDOW_MS / 60000,
          )} minutes`;
      }
    }

    return {
      riskLevel,
      flagged: riskLevel !== AuditRiskLevel.NORMAL,
      flagReason,
    };
  }

  private escalate(current: AuditRiskLevel, candidate: AuditRiskLevel): AuditRiskLevel {
    return RISK_RANK[candidate] > RISK_RANK[current] ? candidate : current;
  }
}
