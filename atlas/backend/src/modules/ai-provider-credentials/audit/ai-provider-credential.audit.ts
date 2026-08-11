import { Injectable, Logger } from '@nestjs/common';
import { AiProviderEventType } from '../../../ai/interfaces';
import { AiProviderCredentialRepository } from '../ai-provider-credential.repository';
import { IAiProviderCredentialEntity } from '../interfaces';

/**
 * AiProviderCredentialAudit
 *
 * Writes versioned history rows (encrypted fields only — never
 * plaintext) and emits structured log lines for lifecycle events. History
 * writes are wrapped in a try/catch so an audit-write failure never
 * breaks the primary mutation. Log lines never include `encryptedFields`
 * or any decrypted value — only identifiers and status metadata.
 */
@Injectable()
export class AiProviderCredentialAudit {
  private readonly logger = new Logger(AiProviderCredentialAudit.name);

  constructor(private readonly repository: AiProviderCredentialRepository) {}

  async logChange(
    credential: IAiProviderCredentialEntity,
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
        encryptedFields: credential.encryptedFields,
        encryptionVersion: credential.encryptionVersion,
        expiresAt: credential.expiresAt ?? null,
        changeReason,
        changedBy: changedBy ?? null,
      });
    } catch (err) {
      this.logger.error(
        `Failed to write audit history for AI provider credential '${credential.id}'`,
        { error: (err as Error).message },
      );
    }
  }

  logEvent(
    event: AiProviderEventType,
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
      ...details, // Never pass encryptedFields/decrypted values here.
    });
  }
}
