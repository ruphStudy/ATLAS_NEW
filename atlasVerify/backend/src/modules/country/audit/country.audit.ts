import { Injectable, Logger } from '@nestjs/common';
import { CountryRepository } from '../repository/country.repository';
import { ICountry } from '../interfaces';

/**
 * CountryAudit
 *
 * Writes versioned snapshots to the domain-specific `CountryHistory` table —
 * mirrors `MarketplaceCapabilityAudit.logDefinitionChange`. Cross-cutting,
 * compliance-oriented entries for lifecycle actions (register/enable/
 * disable/configure) are written separately by `CountryService` directly to
 * the central `AuditLogsService`, matching the pattern already used by
 * `MarketplaceProviderService` — this class never calls it, avoiding two
 * places doing the same thing.
 */
@Injectable()
export class CountryAudit {
  private readonly logger = new Logger(CountryAudit.name);

  constructor(private readonly repository: CountryRepository) {}

  async logChange(country: ICountry, changeReason: string, changedBy?: string): Promise<void> {
    try {
      const { id, code, version, status, deletedAt, createdBy, updatedBy, ...rest } = country;
      await this.repository.createHistory({
        countryId: id,
        code: code.toUpperCase(),
        version,
        status,
        snapshot: rest as unknown as Record<string, unknown>,
        changeReason,
        changedBy: changedBy ?? null,
      });
    } catch (err) {
      this.logger.warn(`Audit log write failed for country '${country.code}': ${(err as Error).message}`);
    }
  }
}
