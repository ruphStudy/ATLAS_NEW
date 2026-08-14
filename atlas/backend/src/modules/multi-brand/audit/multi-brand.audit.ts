import { Injectable, Logger } from '@nestjs/common';
import { MultiBrandRepository } from '../repository/multi-brand.repository';
import { IBrand } from '../interfaces';

/**
 * MultiBrandAudit
 *
 * Writes versioned/ownership-change snapshots to the domain-specific
 * `BrandHistory` table — mirrors `TaxAudit`/`RegionalSettingsAudit`.
 * Cross-cutting, compliance-oriented entries for workspace-scoped actions
 * are written separately by `MultiBrandService` to the central
 * `AuditLogsService`.
 */
@Injectable()
export class MultiBrandAudit {
  private readonly logger = new Logger(MultiBrandAudit.name);

  constructor(private readonly repository: MultiBrandRepository) {}

  async logBrandChange(brand: IBrand, changeReason: string, changedBy?: string): Promise<void> {
    try {
      const { id, version, status, deletedAt, createdBy, updatedBy, ...rest } = brand;
      await this.repository.createBrandHistory({
        brandId: id,
        version,
        status,
        snapshot: rest as unknown as Record<string, unknown>,
        changeReason,
        changedBy: changedBy ?? null,
      });
    } catch (err) {
      this.logger.warn(`Audit log write failed for brand '${brand.code}': ${(err as Error).message}`);
    }
  }
}
