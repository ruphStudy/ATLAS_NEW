import { Injectable, Logger } from '@nestjs/common';
import { TaxRepository } from '../repository/tax.repository';
import { ITaxRule } from '../interfaces';

/**
 * TaxAudit
 *
 * Writes versioned snapshots to the domain-specific `TaxRuleHistory` table
 * — mirrors `CurrencyAudit`/`CountryAudit`. Cross-cutting, compliance-
 * oriented entries for workspace-scoped actions are written separately by
 * `TaxService` directly to the central `AuditLogsService`.
 */
@Injectable()
export class TaxAudit {
  private readonly logger = new Logger(TaxAudit.name);

  constructor(private readonly repository: TaxRepository) {}

  async logRuleChange(rule: ITaxRule, changeReason: string, changedBy?: string): Promise<void> {
    try {
      const { id, ruleKey, version, status, deletedAt, createdBy, updatedBy, ...rest } = rule;
      await this.repository.createRuleHistory({
        ruleId: id,
        ruleKey,
        version,
        status,
        snapshot: rest as unknown as Record<string, unknown>,
        changeReason,
        changedBy: changedBy ?? null,
      });
    } catch (err) {
      this.logger.warn(`Audit log write failed for tax rule '${rule.ruleKey}': ${(err as Error).message}`);
    }
  }
}
