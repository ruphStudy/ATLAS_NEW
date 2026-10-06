import { Injectable, Logger } from '@nestjs/common';
import { AiProviderExpansionRepository } from '../ai-provider-expansion.repository';
import { IAiProviderExpansion } from '../interfaces';

/**
 * AiProviderExpansionAudit
 *
 * Writes onboarding/activation/version/migration snapshots to the
 * `AiProviderExpansionHistory` table. Unlike `AiProviderRegistryAudit`
 * (logger-only — registry entries are simple mutable catalog rows), this
 * module's core purpose is rollout/version history, so it persists real
 * snapshots, mirroring `SupplierProviderExpansionAudit`/
 * `MarketplaceExpansionAudit`.
 */
@Injectable()
export class AiProviderExpansionAudit {
  private readonly logger = new Logger(AiProviderExpansionAudit.name);

  constructor(private readonly repository: AiProviderExpansionRepository) {}

  async logExpansionChange(expansion: IAiProviderExpansion, changeReason: string, changedBy?: string): Promise<void> {
    try {
      const { id, version, rolloutState, deletedAt, createdBy, updatedBy, ...rest } = expansion;
      await this.repository.createHistory({
        expansionId: id,
        version,
        rolloutState,
        snapshot: rest as unknown as Record<string, unknown>,
        changeReason,
        changedBy: changedBy ?? null,
      });
    } catch (err) {
      this.logger.warn(`Audit log write failed for AI provider expansion '${expansion.providerKey}': ${(err as Error).message}`);
    }
  }
}
