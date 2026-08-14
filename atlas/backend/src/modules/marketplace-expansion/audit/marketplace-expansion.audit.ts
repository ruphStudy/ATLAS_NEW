import { Injectable, Logger } from '@nestjs/common';
import { MarketplaceExpansionRepository } from '../repository/marketplace-expansion.repository';
import { IMarketplaceExpansion } from '../interfaces';

/**
 * MarketplaceExpansionAudit
 *
 * Writes onboarding/activation/version/migration snapshots to the
 * domain-specific `MarketplaceExpansionHistory` table — mirrors
 * `MultiChannelAudit`/`TaxAudit`. Cross-cutting, compliance-oriented
 * entries for workspace-scoped actions are written separately by
 * `MarketplaceExpansionService` to the central `AuditLogsService`.
 */
@Injectable()
export class MarketplaceExpansionAudit {
  private readonly logger = new Logger(MarketplaceExpansionAudit.name);

  constructor(private readonly repository: MarketplaceExpansionRepository) {}

  async logExpansionChange(expansion: IMarketplaceExpansion, changeReason: string, changedBy?: string): Promise<void> {
    try {
      const { id, version, rolloutState, deletedAt, createdBy, updatedBy, ...rest } = expansion;
      await this.repository.createExpansionHistory({
        expansionId: id,
        version,
        rolloutState,
        snapshot: rest as unknown as Record<string, unknown>,
        changeReason,
        changedBy: changedBy ?? null,
      });
    } catch (err) {
      this.logger.warn(`Audit log write failed for marketplace expansion '${expansion.providerKey}': ${(err as Error).message}`);
    }
  }
}
