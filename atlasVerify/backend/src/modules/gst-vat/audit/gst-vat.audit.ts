import { Injectable, Logger } from '@nestjs/common';
import { GstVatRepository } from '../repository/gst-vat.repository';
import { IGstVatRegistration } from '../interfaces';

/**
 * GstVatAudit
 *
 * Writes versioned snapshots to the domain-specific
 * `GstVatRegistrationHistory` table — mirrors `TaxAudit`/`CountryAudit`.
 */
@Injectable()
export class GstVatAudit {
  private readonly logger = new Logger(GstVatAudit.name);

  constructor(private readonly repository: GstVatRepository) {}

  async logRegistrationChange(
    registration: IGstVatRegistration,
    changeReason: string,
    changedBy?: string,
  ): Promise<void> {
    try {
      const { id, workspaceId, status, deletedAt, createdBy, updatedBy, ...rest } = registration;
      await this.repository.createRegistrationHistory({
        registrationId: id,
        workspaceId,
        status,
        snapshot: rest as unknown as Record<string, unknown>,
        changeReason,
        changedBy: changedBy ?? null,
      });
    } catch (err) {
      this.logger.warn(
        `Audit log write failed for GST/VAT registration '${registration.id}': ${(err as Error).message}`,
      );
    }
  }
}
