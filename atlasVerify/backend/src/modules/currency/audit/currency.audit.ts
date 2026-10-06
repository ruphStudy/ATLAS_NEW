import { Injectable, Logger } from '@nestjs/common';
import { CurrencyRepository } from '../repository/currency.repository';
import { ICurrency } from '../interfaces';

/**
 * CurrencyAudit
 *
 * Writes versioned snapshots to the domain-specific `CurrencyHistory` table
 * — mirrors `CountryAudit`/`MarketplaceCapabilityAudit`. Cross-cutting,
 * compliance-oriented entries for workspace-scoped actions (rate recording,
 * base/reporting currency configuration) are written separately by
 * `CurrencyService` directly to the central `AuditLogsService`.
 */
@Injectable()
export class CurrencyAudit {
  private readonly logger = new Logger(CurrencyAudit.name);

  constructor(private readonly repository: CurrencyRepository) {}

  async logChange(currency: ICurrency, changeReason: string, changedBy?: string): Promise<void> {
    try {
      const { id, code, version, status, deletedAt, createdBy, updatedBy, ...rest } = currency;
      await this.repository.createHistory({
        currencyId: id,
        code: code.toUpperCase(),
        version,
        status,
        snapshot: rest as unknown as Record<string, unknown>,
        changeReason,
        changedBy: changedBy ?? null,
      });
    } catch (err) {
      this.logger.warn(`Audit log write failed for currency '${currency.code}': ${(err as Error).message}`);
    }
  }
}
