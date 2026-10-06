import { Injectable, Logger } from '@nestjs/common';
import { MarketplaceProviderCredentialsRepository } from '../marketplace-provider-credentials.repository';
import { CredentialEvent, CredentialStatus, CredentialVersionStatus, IMarketplaceProviderCredential } from '../interfaces';

/**
 * Writes credential audit log entries.
 * Uses the dedicated credential history table for versioned snapshots
 * and a shared audit action log for business events.
 */
@Injectable()
export class MarketplaceCredentialAudit {
  private readonly logger = new Logger(MarketplaceCredentialAudit.name);

  constructor(
    private readonly repository: MarketplaceProviderCredentialsRepository,
  ) {}

  async logChange(
    credential: IMarketplaceProviderCredential,
    changeReason: string,
    changedBy?: string | null,
  ): Promise<void> {
    try {
      await this.repository.createHistory({
        credentialId: credential.id,
        workspaceId: credential.workspaceId,
        providerKey: credential.providerKey,
        version: credential.version,
        status: credential.status,
        versionStatus: credential.versionStatus,
        encryptedFields: credential.encryptedFields,
        encryptionVersion: credential.encryptionVersion,
        expiresAt: credential.expiresAt,
        changeReason,
        changedBy,
      });
    } catch (err) {
      this.logger.error(
        `Failed to write audit history for credential '${credential.id}'`,
        { error: (err as Error).message },
      );
    }
  }

  logEvent(
    event: CredentialEvent,
    credentialId: string,
    workspaceId: string,
    providerKey: string,
    performedBy?: string | null,
    details?: Record<string, unknown>,
  ): void {
    this.logger.log(`[AUDIT] ${event}`, {
      credentialId,
      workspaceId,
      providerKey,
      performedBy: performedBy ?? 'system',
      // Never log encrypted fields or plain-text values
      ...details,
    });
  }
}
