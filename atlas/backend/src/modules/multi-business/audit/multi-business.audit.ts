import { Injectable, Logger } from '@nestjs/common';
import { MultiBusinessRepository } from '../repository/multi-business.repository';
import { IBusiness } from '../interfaces';

/**
 * MultiBusinessAudit
 *
 * Writes versioned/ownership-change snapshots to the domain-specific
 * `BusinessHistory` table — mirrors `MultiBrandAudit`/`TaxAudit`.
 * Cross-cutting, compliance-oriented entries for workspace-scoped actions
 * are written separately by `MultiBusinessService` to the central
 * `AuditLogsService`.
 */
@Injectable()
export class MultiBusinessAudit {
  private readonly logger = new Logger(MultiBusinessAudit.name);

  constructor(private readonly repository: MultiBusinessRepository) {}

  async logBusinessChange(business: IBusiness, changeReason: string, changedBy?: string): Promise<void> {
    try {
      const { id, version, status, deletedAt, createdBy, updatedBy, ...rest } = business;
      await this.repository.createBusinessHistory({
        businessId: id,
        version,
        status,
        snapshot: rest as unknown as Record<string, unknown>,
        changeReason,
        changedBy: changedBy ?? null,
      });
    } catch (err) {
      this.logger.warn(`Audit log write failed for business '${business.code}': ${(err as Error).message}`);
    }
  }
}
