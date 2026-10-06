import { Injectable, Logger } from '@nestjs/common';
import { ShippingProviderExpansionRepository } from '../repository/shipping-provider-expansion.repository';
import { IShippingProviderExpansion } from '../interfaces';

/**
 * ShippingProviderExpansionAudit
 *
 * Writes onboarding/activation/version/migration snapshots to the
 * domain-specific `ShippingProviderExpansionHistory` table — mirrors
 * `SupplierProviderExpansionAudit`/`MarketplaceExpansionAudit`.
 * Cross-cutting, compliance-oriented entries for workspace-scoped
 * actions are written separately by `ShippingProviderExpansionService`
 * to the central `AuditLogsService`.
 */
@Injectable()
export class ShippingProviderExpansionAudit {
  private readonly logger = new Logger(ShippingProviderExpansionAudit.name);

  constructor(private readonly repository: ShippingProviderExpansionRepository) {}

  async logExpansionChange(expansion: IShippingProviderExpansion, changeReason: string, changedBy?: string): Promise<void> {
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
      this.logger.warn(`Audit log write failed for shipping provider expansion '${expansion.providerKey}': ${(err as Error).message}`);
    }
  }
}
