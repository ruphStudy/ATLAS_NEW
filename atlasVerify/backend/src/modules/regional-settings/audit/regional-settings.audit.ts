import { Injectable, Logger } from '@nestjs/common';
import { RegionalSettingsRepository } from '../repository/regional-settings.repository';
import { IRegionalSettingsProfile } from '../interfaces';

/**
 * RegionalSettingsAudit
 *
 * Writes versioned snapshots to the domain-specific
 * `RegionalSettingsProfileHistory` table — mirrors `TaxAudit`/`CurrencyAudit`.
 * Cross-cutting, compliance-oriented entries for workspace-scoped actions
 * are written separately by `RegionalSettingsService` to the central
 * `AuditLogsService`.
 */
@Injectable()
export class RegionalSettingsAudit {
  private readonly logger = new Logger(RegionalSettingsAudit.name);

  constructor(private readonly repository: RegionalSettingsRepository) {}

  async logProfileChange(profile: IRegionalSettingsProfile, changeReason: string, changedBy?: string): Promise<void> {
    try {
      const { id, key, version, status, deletedAt, createdBy, updatedBy, ...rest } = profile;
      await this.repository.createProfileHistory({
        profileId: id,
        key,
        version,
        status,
        snapshot: rest as unknown as Record<string, unknown>,
        changeReason,
        changedBy: changedBy ?? null,
      });
    } catch (err) {
      this.logger.warn(`Audit log write failed for regional settings profile '${profile.key}': ${(err as Error).message}`);
    }
  }
}
