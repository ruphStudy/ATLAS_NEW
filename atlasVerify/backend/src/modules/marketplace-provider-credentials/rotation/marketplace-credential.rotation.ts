import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MarketplaceProviderCredentialsRepository } from '../marketplace-provider-credentials.repository';
import { MarketplaceCredentialEncryptor } from '../encryptor/marketplace-credential.encryptor';
import { MarketplaceCredentialAudit } from '../audit/marketplace-credential.audit';
import { MarketplaceCredentialCache } from '../cache/marketplace-credential.cache';
import { CredentialEvent, CredentialStatus, CredentialVersionStatus, RotationRequest, RotationResult } from '../interfaces';

@Injectable()
export class MarketplaceCredentialRotation {
  private readonly logger = new Logger(MarketplaceCredentialRotation.name);

  constructor(
    private readonly repository: MarketplaceProviderCredentialsRepository,
    private readonly encryptor: MarketplaceCredentialEncryptor,
    private readonly audit: MarketplaceCredentialAudit,
    private readonly cache: MarketplaceCredentialCache,
  ) {}

  /**
   * Rotates credential fields atomically.
   * Steps:
   * 1. Load existing credential
   * 2. Snapshot current state in history
   * 3. Encrypt new fields
   * 4. Update the record with new encrypted fields + bumped version
   * 5. Invalidate cache entry
   */
  async rotate(request: RotationRequest): Promise<RotationResult> {
    const existing = await this.repository.findById(
      request.credentialId,
      request.workspaceId,
    );

    if (!existing) {
      throw new NotFoundException(
        `Credential '${request.credentialId}' not found in workspace '${request.workspaceId}'`,
      );
    }

    const previousVersion = existing.version;

    // Snapshot before rotation
    await this.audit.logChange(existing, request.reason ?? 'Pre-rotation snapshot', request.performedBy);

    // Encrypt new fields
    const encryptedFields = this.encryptor.encryptFields(
      request.newFields,
      request.workspaceId,
      existing.providerKey,
    );

    const newVersion = previousVersion + 1;
    const rotatedAt = new Date();

    const updated = await this.repository.update(request.credentialId, request.workspaceId, {
      encryptedFields,
      version: newVersion,
      status: CredentialStatus.PENDING_VALIDATION,
      lastRotatedAt: rotatedAt,
      rotationScheduledAt: request.scheduleAt ?? null,
      updatedBy: request.performedBy,
    });

    // Snapshot after rotation
    await this.audit.logChange(updated, request.reason ?? 'Post-rotation snapshot', request.performedBy);

    this.audit.logEvent(
      CredentialEvent.ROTATED,
      request.credentialId,
      request.workspaceId,
      existing.providerKey,
      request.performedBy,
      { previousVersion, newVersion },
    );

    this.cache.invalidateById(request.credentialId);

    return { credentialId: request.credentialId, previousVersion, newVersion, rotatedAt };
  }

  /**
   * Schedules a future rotation by setting `rotationScheduledAt`.
   * The actual rotation is performed by a background job when the time arrives.
   */
  async schedule(
    credentialId: string,
    workspaceId: string,
    scheduleAt: Date,
    scheduledBy?: string,
  ): Promise<void> {
    const existing = await this.repository.findById(credentialId, workspaceId);
    if (!existing) {
      throw new NotFoundException(`Credential '${credentialId}' not found`);
    }

    await this.repository.update(credentialId, workspaceId, {
      rotationScheduledAt: scheduleAt,
      updatedBy: scheduledBy,
    });

    this.logger.log(`Scheduled rotation for credential '${credentialId}' at ${scheduleAt.toISOString()}`);
  }
}
