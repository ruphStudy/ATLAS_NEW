import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory } from '@modules/audit-logs/interfaces';
import { MarketplaceProviderCredentialsRepository } from './marketplace-provider-credentials.repository';
import { MarketplaceCredentialEncryptor } from './encryptor/marketplace-credential.encryptor';
import { MarketplaceCredentialDecryptor } from './decryptor/marketplace-credential.decryptor';
import { MarketplaceCredentialValidator } from './validator/marketplace-credential.validator';
import { MarketplaceCredentialCache } from './cache/marketplace-credential.cache';
import { MarketplaceCredentialAudit } from './audit/marketplace-credential.audit';
import { MarketplaceCredentialRotation } from './rotation/marketplace-credential.rotation';
import { MarketplaceCredentialEventQueue } from './events/marketplace-credential-events.queue';
import {
  CredentialEvent,
  CredentialStatus,
  CredentialVersionStatus,
  DecryptedCredentialBag,
  IMarketplaceProviderCredential,
  ProviderCredentialSchema,
  RotationResult,
} from './interfaces';
import { MP_CREDENTIAL_CONSTANTS } from './constants';
import {
  CreateCredentialDto,
  CredentialFilterDto,
  CredentialHistoryResponseDto,
  CredentialResponseDto,
  PaginatedCredentialResponseDto,
  RotateCredentialDto,
  UpdateCredentialDto,
} from './dto';

const MARKETPLACE_PROVIDER_CREDENTIALS_MODULE = 'marketplace-provider-credentials';

@Injectable()
export class MarketplaceProviderCredentialsService {
  private readonly logger = new Logger(MarketplaceProviderCredentialsService.name);

  constructor(
    private readonly repository: MarketplaceProviderCredentialsRepository,
    private readonly encryptor: MarketplaceCredentialEncryptor,
    private readonly decryptor: MarketplaceCredentialDecryptor,
    private readonly validator: MarketplaceCredentialValidator,
    private readonly cache: MarketplaceCredentialCache,
    private readonly audit: MarketplaceCredentialAudit,
    private readonly rotation: MarketplaceCredentialRotation,
    private readonly eventQueue: MarketplaceCredentialEventQueue,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // ── Create ────────────────────────────────────────────────

  async create(
    workspaceId: string,
    dto: CreateCredentialDto,
    userId?: string,
    schema?: ProviderCredentialSchema | null,
  ): Promise<CredentialResponseDto> {
    // Validate plain-text fields before encrypting
    const validation = this.validator.validate(
      {
        workspaceId,
        providerKey: dto.providerKey,
        credentialSetName: dto.credentialSetName,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
      { providerKey: dto.providerKey, isCreate: true, schema, plainFields: dto.fields },
    );

    if (!validation.valid) {
      throw new BadRequestException({ message: 'Credential validation failed', errors: validation.errors });
    }

    const encryptedFields = this.encryptor.encryptFields(
      dto.fields,
      workspaceId,
      dto.providerKey,
    );

    const credential = await this.repository.create({
      workspaceId,
      providerKey: dto.providerKey,
      accountId: dto.accountId,
      marketplaceKey: dto.marketplaceKey,
      credentialSetName: dto.credentialSetName,
      description: dto.description,
      encryptedFields,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      createdBy: userId,
      updatedBy: userId,
    });

    await this.audit.logChange(credential, 'Created', userId);
    await this.publishEvent(CredentialEvent.CREATED, credential, userId);
    await this.recordAudit(credential, 'marketplace_provider_credentials.authorized', userId);

    return CredentialResponseDto.from(credential);
  }

  // ── Read ──────────────────────────────────────────────────

  async findAll(workspaceId: string, filter: CredentialFilterDto): Promise<PaginatedCredentialResponseDto> {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? MP_CREDENTIAL_CONSTANTS.DEFAULT_PAGE_SIZE, MP_CREDENTIAL_CONSTANTS.MAX_PAGE_SIZE);
    const [items, total] = await this.repository.findMany({ ...filter, workspaceId, page, limit });
    return PaginatedCredentialResponseDto.from(items, total, page, limit);
  }

  async findById(id: string, workspaceId: string): Promise<CredentialResponseDto> {
    const credential = await this.findOrFail(id, workspaceId);
    return CredentialResponseDto.from(credential);
  }

  // ── Update ────────────────────────────────────────────────

  async update(
    id: string,
    workspaceId: string,
    dto: UpdateCredentialDto,
    userId?: string,
    schema?: ProviderCredentialSchema | null,
  ): Promise<CredentialResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    this.assertMutable(existing);

    let encryptedFields = existing.encryptedFields;

    if (dto.fields && Object.keys(dto.fields).length > 0) {
      const validation = this.validator.validate(
        { workspaceId, providerKey: existing.providerKey, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : existing.expiresAt },
        { providerKey: existing.providerKey, schema, plainFields: dto.fields },
      );
      if (!validation.valid) {
        throw new BadRequestException({ message: 'Credential validation failed', errors: validation.errors });
      }

      // Merge new encrypted fields with existing
      const newEncrypted = this.encryptor.encryptFields(dto.fields, workspaceId, existing.providerKey);
      encryptedFields = { ...existing.encryptedFields, ...newEncrypted };
    }

    await this.audit.logChange(existing, 'Pre-update snapshot', userId);

    const updated = await this.repository.update(id, workspaceId, {
      credentialSetName: dto.credentialSetName ?? existing.credentialSetName,
      description: dto.description !== undefined ? dto.description : existing.description,
      encryptedFields,
      version: existing.version + 1,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : existing.expiresAt,
      updatedBy: userId,
    });

    await this.audit.logChange(updated, 'Updated', userId);
    await this.publishEvent(CredentialEvent.UPDATED, updated, userId);
    this.cache.invalidateById(id);

    return CredentialResponseDto.from(updated);
  }

  // ── Status Transitions ────────────────────────────────────

  async enable(id: string, workspaceId: string, userId?: string): Promise<CredentialResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    this.assertTransition(existing, CredentialStatus.ACTIVE);

    const updated = await this.repository.update(id, workspaceId, { status: CredentialStatus.ACTIVE, updatedBy: userId });
    await this.publishEvent(CredentialEvent.ENABLED, updated, userId);
    await this.recordAudit(updated, 'marketplace_provider_credentials.enabled', userId);
    this.cache.invalidateById(id);
    return CredentialResponseDto.from(updated);
  }

  async disable(id: string, workspaceId: string, userId?: string): Promise<CredentialResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    this.assertTransition(existing, CredentialStatus.DISABLED);

    const updated = await this.repository.update(id, workspaceId, { status: CredentialStatus.DISABLED, updatedBy: userId });
    await this.publishEvent(CredentialEvent.DISABLED, updated, userId);
    await this.recordAudit(updated, 'marketplace_provider_credentials.disabled', userId);
    this.cache.invalidateById(id);
    return CredentialResponseDto.from(updated);
  }

  async revoke(id: string, workspaceId: string, userId?: string): Promise<CredentialResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    this.assertTransition(existing, CredentialStatus.REVOKED);

    const updated = await this.repository.update(id, workspaceId, { status: CredentialStatus.REVOKED, updatedBy: userId });
    await this.audit.logChange(updated, 'Revoked', userId);
    await this.publishEvent(CredentialEvent.REVOKED, updated, userId);
    await this.recordAudit(updated, 'marketplace_provider_credentials.revoked', userId);
    this.cache.invalidateById(id);
    return CredentialResponseDto.from(updated);
  }

  async markExpired(id: string, workspaceId: string): Promise<void> {
    const existing = await this.findOrFail(id, workspaceId);
    await this.repository.update(id, workspaceId, { status: CredentialStatus.EXPIRED });
    await this.publishEvent(CredentialEvent.EXPIRED, { ...existing, status: CredentialStatus.EXPIRED }, undefined);
    this.cache.invalidateById(id);
  }

  // ── Deletion ──────────────────────────────────────────────

  async delete(id: string, workspaceId: string, userId?: string): Promise<void> {
    const existing = await this.findOrFail(id, workspaceId);
    await this.repository.softDelete(id, workspaceId);
    await this.publishEvent(CredentialEvent.DELETED, existing, undefined);
    await this.recordAudit(existing, 'marketplace_provider_credentials.deleted', userId);
    this.cache.invalidateById(id);
  }

  // ── Rotation ──────────────────────────────────────────────

  async rotate(
    id: string,
    workspaceId: string,
    dto: RotateCredentialDto,
    userId?: string,
  ): Promise<RotationResult> {
    const result = await this.rotation.rotate({
      credentialId: id,
      workspaceId,
      newFields: dto.newFields,
      reason: dto.reason,
      performedBy: userId,
      scheduleAt: dto.scheduleAt ? new Date(dto.scheduleAt) : null,
    });

    const updated = await this.findOrFail(id, workspaceId);
    await this.publishEvent(CredentialEvent.ROTATED, updated, userId, {
      previousVersion: result.previousVersion,
      newVersion: result.newVersion,
    });
    await this.recordAudit(updated, 'marketplace_provider_credentials.rotated', userId, {
      previousVersion: result.previousVersion,
      newVersion: result.newVersion,
    });

    return result;
  }

  // ── Validate ──────────────────────────────────────────────

  async validateById(
    id: string,
    workspaceId: string,
    schema?: ProviderCredentialSchema | null,
  ): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    const credential = await this.findOrFail(id, workspaceId);

    const result = this.validator.validate(credential, { providerKey: credential.providerKey, schema });

    const statusUpdate = result.valid
      ? CredentialStatus.ACTIVE
      : CredentialStatus.VALIDATION_FAILED;

    await this.repository.update(id, workspaceId, {
      status: statusUpdate,
      lastValidatedAt: new Date(),
    });

    await this.publishEvent(CredentialEvent.VALIDATED, { ...credential, status: statusUpdate }, undefined, {
      valid: result.valid,
    });

    return {
      valid: result.valid,
      errors: result.errors.map((e) => e.message),
      warnings: result.warnings,
    };
  }

  // ── Decryption (controlled access) ───────────────────────

  /**
   * Decrypts and returns plain-text credential bag.
   * Only call this when you need to pass credentials to an adapter.
   * Never log or persist the returned values.
   */
  decryptCredential(credential: IMarketplaceProviderCredential): DecryptedCredentialBag {
    return this.decryptor.decryptCredential(credential);
  }

  /**
   * Resolves the active credential for a provider in a workspace.
   * Returns the DB record (still encrypted) — caller decrypts only if needed.
   */
  async resolveActive(
    providerKey: string,
    workspaceId: string,
    accountId?: string | null,
    marketplaceKey?: string | null,
  ): Promise<IMarketplaceProviderCredential | null> {
    const cacheKey = MarketplaceCredentialCache.buildKey(providerKey, workspaceId, accountId, marketplaceKey);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const credential = await this.repository.findActive(providerKey, workspaceId, accountId, marketplaceKey);
    if (credential) {
      this.cache.set(cacheKey, credential);
    }

    return credential;
  }

  // ── History ───────────────────────────────────────────────

  async getHistory(id: string, workspaceId: string): Promise<CredentialHistoryResponseDto[]> {
    await this.findOrFail(id, workspaceId);
    const entries = await this.repository.findHistory(id);
    return entries.map((e) => CredentialHistoryResponseDto.from(e));
  }

  // ── Cache Management ──────────────────────────────────────

  invalidateCache(providerKey?: string, workspaceId?: string): void {
    if (providerKey) this.cache.invalidateByProvider(providerKey);
    else if (workspaceId) this.cache.invalidateByWorkspace(workspaceId);
    else this.cache.flush();
  }

  // ── Helpers ───────────────────────────────────────────────

  private async findOrFail(id: string, workspaceId: string): Promise<IMarketplaceProviderCredential> {
    const credential = await this.repository.findById(id, workspaceId);
    if (!credential) {
      throw new NotFoundException(`Marketplace provider credential '${id}' not found`);
    }
    return credential;
  }

  private assertMutable(credential: IMarketplaceProviderCredential): void {
    if (credential.status === CredentialStatus.REVOKED) {
      throw new BadRequestException('Cannot modify a revoked credential');
    }
  }

  private assertTransition(credential: IMarketplaceProviderCredential, to: CredentialStatus): void {
    const allowed = MP_CREDENTIAL_CONSTANTS.ALLOWED_TRANSITIONS[credential.status];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Cannot transition credential from '${credential.status}' to '${to}'`,
      );
    }
  }

  private async publishEvent(
    event: CredentialEvent,
    credential: IMarketplaceProviderCredential,
    performedBy?: string | null,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.eventQueue.enqueue({
        event,
        credentialId: credential.id,
        workspaceId: credential.workspaceId,
        providerKey: credential.providerKey,
        accountId: credential.accountId,
        marketplaceKey: credential.marketplaceKey,
        version: credential.version,
        performedBy,
        metadata,
        timestamp: new Date(),
      });
    } catch (err) {
      this.logger.warn(`Failed to publish credential event '${event}'`, { error: (err as Error).message });
    }
  }

  /**
   * Writes a lightweight entry to the central, cross-cutting audit ledger
   * for SP-API credential authorize/rotate/revoke lifecycle actions.
   * Complements — does not replace — `MarketplaceCredentialAudit`'s own
   * versioned history table. Never includes encrypted/plain-text field
   * values.
   */
  private async recordAudit(
    credential: IMarketplaceProviderCredential,
    action: string,
    performedBy?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.auditLogsService.record({
        workspaceId: credential.workspaceId,
        actorType: ActivityActorType.USER,
        actorId: performedBy,
        action,
        actionCategory: AuditActionCategory.CONFIGURATION,
        module: MARKETPLACE_PROVIDER_CREDENTIALS_MODULE,
        entityType: 'MarketplaceProviderCredential',
        entityId: credential.id,
        outcome: ActivityOutcome.SUCCESS,
        metadata: {
          providerKey: credential.providerKey,
          accountId: credential.accountId,
          marketplaceKey: credential.marketplaceKey,
          status: credential.status,
          ...metadata,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to record central audit entry for '${action}': ${(err as Error).message}`);
    }
  }
}
