import { Injectable, Logger } from '@nestjs/common';
import { SupplierProviderExpansionRepository } from '../repository/supplier-provider-expansion.repository';
import { ISupplierProviderExpansion } from '../interfaces';

/**
 * SupplierProviderExpansionAudit
 *
 * Writes onboarding/activation/version/migration snapshots to the
 * domain-specific `SupplierProviderExpansionHistory` table — mirrors
 * `MarketplaceExpansionAudit`/`MultiChannelAudit`. Cross-cutting,
 * compliance-oriented entries for workspace-scoped actions are written
 * separately by `SupplierProviderExpansionService` to the central
 * `AuditLogsService`.
 */
@Injectable()
export class SupplierProviderExpansionAudit {
  private readonly logger = new Logger(SupplierProviderExpansionAudit.name);

  constructor(private readonly repository: SupplierProviderExpansionRepository) {}

  async logExpansionChange(expansion: ISupplierProviderExpansion, changeReason: string, changedBy?: string): Promise<void> {
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
      this.logger.warn(`Audit log write failed for supplier provider expansion '${expansion.providerCode}': ${(err as Error).message}`);
    }
  }
}
