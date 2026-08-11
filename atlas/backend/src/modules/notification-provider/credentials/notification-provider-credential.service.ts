import { Injectable, Logger } from '@nestjs/common';
import { NotificationProviderCredentialRepository } from './notification-provider-credential.repository';
import { NotificationProviderCredentialEncryptor } from './notification-provider-credential.encryptor';
import { NotificationProviderCredentialDecryptor } from './notification-provider-credential.decryptor';
import { NotificationProviderRegistry } from '../../../notification-provider/registry/notification-provider.registry';
import { NotificationProviderHealthService } from '../../../notification-provider/health/notification-provider-health.service';
import { NotificationProviderEventQueue } from '../jobs';
import {
  CreateProviderCredentialDto,
  UpdateProviderCredentialDto,
  ProviderCredentialFilterDto,
  PaginatedProviderCredentialResponseDto,
} from '../dto';
import {
  INotificationProviderCredential,
  INotificationProviderCredentialHistory,
  DecryptedCredentialBag,
  NotificationProviderCredentialStatus,
  NotificationProviderPersistedEvent,
} from '../interfaces';
import { NOTIFICATION_PROVIDER_CREDENTIAL_TRANSITIONS } from '../constants';
import {
  NotificationProviderCredentialNotFoundException,
  NotificationProviderCredentialDuplicateException,
  NotificationProviderCredentialInvalidTransitionException,
  NotificationProviderCredentialExpiredException,
  NotificationProviderCredentialRevokedException,
  NotificationProviderCredentialConnectionValidationException,
} from '../exceptions/notification-provider-persisted.exceptions';
import { NotificationProviderHealthStatus } from '../../../notification-provider/interfaces';

@Injectable()
export class NotificationProviderCredentialService {
  private readonly logger = new Logger(NotificationProviderCredentialService.name);

  constructor(
    private readonly repository: NotificationProviderCredentialRepository,
    private readonly encryptor: NotificationProviderCredentialEncryptor,
    private readonly decryptor: NotificationProviderCredentialDecryptor,
    private readonly foundationRegistry: NotificationProviderRegistry,
    private readonly foundationHealthService: NotificationProviderHealthService,
    private readonly eventQueue: NotificationProviderEventQueue,
  ) {}

  async create(dto: CreateProviderCredentialDto): Promise<INotificationProviderCredential> {
    const existing = await this.repository.findConflicting(
      dto.workspaceId,
      dto.providerKey,
      dto.credentialSetName,
    );
    if (existing) {
      throw new NotificationProviderCredentialDuplicateException(
        dto.providerKey,
        dto.credentialSetName,
      );
    }

    const encryptedFields = this.encryptor.encryptFields(
      dto.fields,
      dto.workspaceId,
      dto.providerKey,
    );

    const credential = await this.repository.create({
      workspaceId: dto.workspaceId,
      providerKey: dto.providerKey,
      channel: dto.channel,
      credentialSetName: dto.credentialSetName,
      description: dto.description,
      status: NotificationProviderCredentialStatus.PENDING_VALIDATION,
      version: 1,
      encryptedFields,
      encryptionVersion: 'v1',
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      createdBy: dto.createdBy,
    });

    await this.writeHistory(credential, 1, undefined, dto.createdBy);

    await this.eventQueue.publish({
      event: NotificationProviderPersistedEvent.CREDENTIAL_CREATED,
      workspaceId: credential.workspaceId,
      providerKey: credential.providerKey,
      credentialId: credential.id,
    });

    return credential;
  }

  async update(
    id: string,
    dto: UpdateProviderCredentialDto,
  ): Promise<INotificationProviderCredential> {
    const existing = await this.findById(id);
    const nextVersion = existing.version + 1;

    const encryptedFields = dto.fields
      ? this.encryptor.encryptFields(dto.fields, existing.workspaceId, existing.providerKey)
      : existing.encryptedFields;

    const updated = await this.repository.update(id, {
      description: dto.description,
      encryptedFields,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      version: nextVersion,
      updatedBy: dto.changedBy,
    });

    await this.writeHistory(updated, nextVersion, dto.changeReason, dto.changedBy);

    await this.eventQueue.publish({
      event: NotificationProviderPersistedEvent.CREDENTIAL_UPDATED,
      workspaceId: updated.workspaceId,
      providerKey: updated.providerKey,
      credentialId: updated.id,
    });

    return updated;
  }

  async rotate(
    id: string,
    fields: Record<string, string>,
    changedBy?: string,
  ): Promise<INotificationProviderCredential> {
    const existing = await this.findById(id);
    const nextVersion = existing.version + 1;

    const encryptedFields = this.encryptor.encryptFields(
      fields,
      existing.workspaceId,
      existing.providerKey,
    );

    const updated = await this.repository.update(id, {
      encryptedFields,
      version: nextVersion,
      lastRotatedAt: new Date(),
      updatedBy: changedBy,
    });

    await this.writeHistory(updated, nextVersion, 'Credential rotated', changedBy);

    await this.eventQueue.publish({
      event: NotificationProviderPersistedEvent.CREDENTIAL_ROTATED,
      workspaceId: updated.workspaceId,
      providerKey: updated.providerKey,
      credentialId: updated.id,
    });

    return updated;
  }

  async setStatus(
    id: string,
    to: NotificationProviderCredentialStatus,
  ): Promise<INotificationProviderCredential> {
    const existing = await this.findById(id);
    const allowed = NOTIFICATION_PROVIDER_CREDENTIAL_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(to)) {
      throw new NotificationProviderCredentialInvalidTransitionException(existing.status, to);
    }

    const updated = await this.repository.update(id, { status: to });

    if (to === NotificationProviderCredentialStatus.REVOKED) {
      await this.eventQueue.publish({
        event: NotificationProviderPersistedEvent.CREDENTIAL_REVOKED,
        workspaceId: updated.workspaceId,
        providerKey: updated.providerKey,
        credentialId: updated.id,
      });
    }

    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.setStatus(id, NotificationProviderCredentialStatus.REVOKED);
    await this.repository.softDelete(id);
  }

  async findById(id: string): Promise<INotificationProviderCredential> {
    const credential = await this.repository.findById(id);
    if (!credential) {
      throw new NotificationProviderCredentialNotFoundException(id);
    }
    return credential;
  }

  async findAll(
    filter: ProviderCredentialFilterDto,
  ): Promise<PaginatedProviderCredentialResponseDto> {
    const [data, total] = await this.repository.findAll(filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    return {
      data: data as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findHistory(id: string): Promise<INotificationProviderCredentialHistory[]> {
    await this.findById(id);
    return this.repository.findHistory(id);
  }

  /**
   * Connection test — never probes a vendor API directly. Delegates to the
   * foundation registry+health-service exactly like
   * AiProviderCredentialConnectionValidator does, so this stays
   * provider-agnostic: if no concrete adapter for `providerKey` has
   * registered itself with the foundation, this reports "not registered"
   * rather than attempting any network call itself.
   */
  async validateConnection(id: string): Promise<{
    valid: boolean;
    checkedAt: Date;
    message?: string;
    latencyMs?: number;
  }> {
    const credential = await this.findById(id);
    const startedAt = Date.now();

    if (!this.foundationRegistry.has(credential.providerKey)) {
      const result = {
        valid: false,
        checkedAt: new Date(),
        message: `Notification provider '${credential.providerKey}' is not registered with the Notification Provider Foundation`,
      };

      await this.repository.update(id, { lastValidatedAt: result.checkedAt });
      await this.eventQueue.publish({
        event: NotificationProviderPersistedEvent.CREDENTIAL_VALIDATION_FAILED,
        workspaceId: credential.workspaceId,
        providerKey: credential.providerKey,
        credentialId: id,
        metadata: { message: result.message },
      });

      return result;
    }

    const provider = this.foundationRegistry.get(credential.providerKey);
    const health = await this.foundationHealthService.checkHealth(provider);
    const valid = health.status === NotificationProviderHealthStatus.HEALTHY;

    await this.repository.update(id, {
      lastValidatedAt: new Date(),
      status: valid
        ? NotificationProviderCredentialStatus.ACTIVE
        : NotificationProviderCredentialStatus.VALIDATION_FAILED,
    });

    await this.eventQueue.publish({
      event: valid
        ? NotificationProviderPersistedEvent.CREDENTIAL_VALIDATION_SUCCEEDED
        : NotificationProviderPersistedEvent.CREDENTIAL_VALIDATION_FAILED,
      workspaceId: credential.workspaceId,
      providerKey: credential.providerKey,
      credentialId: id,
    });

    if (!valid) {
      throw new NotificationProviderCredentialConnectionValidationException(
        credential.providerKey,
        health.message ?? 'health check reported unhealthy',
      );
    }

    return {
      valid,
      checkedAt: new Date(),
      message: health.message,
      latencyMs: Date.now() - startedAt,
    };
  }

  /**
   * Internal-only: resolves transiently-decrypted credential fields for a
   * workspace+provider, for use by the delivery orchestration when
   * initializing an adapter instance. Never called from a controller.
   */
  async resolveDecrypted(
    workspaceId: string,
    providerKey: string,
  ): Promise<DecryptedCredentialBag> {
    const credential = await this.repository.findActiveForProvider(workspaceId, providerKey);
    if (!credential) {
      throw new NotificationProviderCredentialNotFoundException(
        `${providerKey}:${workspaceId}`,
      );
    }

    this.assertUsable(credential);
    return this.decryptor.decryptCredential(credential);
  }

  private assertUsable(credential: INotificationProviderCredential): void {
    if (credential.status === NotificationProviderCredentialStatus.REVOKED) {
      throw new NotificationProviderCredentialRevokedException(credential.id);
    }
    if (
      credential.status === NotificationProviderCredentialStatus.EXPIRED ||
      (credential.expiresAt && credential.expiresAt.getTime() < Date.now())
    ) {
      throw new NotificationProviderCredentialExpiredException(credential.id);
    }
  }

  private async writeHistory(
    credential: INotificationProviderCredential,
    version: number,
    changeReason?: string,
    changedBy?: string,
  ): Promise<void> {
    try {
      await this.repository.createHistory({
        credentialId: credential.id,
        workspaceId: credential.workspaceId,
        providerKey: credential.providerKey,
        version,
        status: credential.status,
        encryptedFields: credential.encryptedFields,
        encryptionVersion: credential.encryptionVersion,
        changeReason,
        changedBy,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to write credential history for ${credential.id}: ${(error as Error).message}`,
      );
    }
  }
}
