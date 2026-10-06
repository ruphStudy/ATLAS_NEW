import { Injectable } from '@nestjs/common';
import { ResourceNotFoundException } from '../../common/exceptions/atlas.exception';
import { AiProviderEventType } from '../../ai/interfaces';
import { AiProviderEventEmitter } from '../../ai/events/ai-provider-event.emitter';
import { AiProviderCredentialRepository } from './ai-provider-credential.repository';
import { AiProviderCredentialValidator } from './validator/ai-provider-credential.validator';
import { AiProviderCredentialEncryptor } from './encryptor/ai-provider-credential.encryptor';
import { AiProviderCredentialCache } from './cache/ai-provider-credential.cache';
import { AiProviderCredentialAudit } from './audit/ai-provider-credential.audit';
import { AiProviderCredentialConnectionValidator } from './connection/ai-provider-credential-connection.validator';
import { AI_CREDENTIAL_CONSTANTS } from './constants';
import { CredentialStatus, CredentialType, IAiProviderCredentialEntity } from './interfaces';
import {
  AiProviderCredentialDuplicateException,
  AiProviderCredentialInvalidTransitionException,
  AiProviderCredentialRevokedException,
  AiProviderCredentialValidationException,
} from './exceptions/ai-provider-credential.exceptions';
import {
  AiProviderCredentialFilterDto,
  AiProviderCredentialHistoryResponseDto,
  AiProviderCredentialResponseDto,
  ConnectionValidationResponseDto,
  CreateAiProviderCredentialDto,
  PaginatedAiProviderCredentialResponseDto,
  RefreshAiProviderCredentialDto,
  RotateAiProviderCredentialDto,
  UpdateAiProviderCredentialDto,
} from './dto';

@Injectable()
export class AiProviderCredentialService {
  constructor(
    private readonly repository: AiProviderCredentialRepository,
    private readonly validator: AiProviderCredentialValidator,
    private readonly encryptor: AiProviderCredentialEncryptor,
    private readonly cache: AiProviderCredentialCache,
    private readonly audit: AiProviderCredentialAudit,
    private readonly connectionValidator: AiProviderCredentialConnectionValidator,
    private readonly eventEmitter: AiProviderEventEmitter,
  ) {}

  // ── Create ────────────────────────────────────────────────

  async create(
    workspaceId: string,
    dto: CreateAiProviderCredentialDto,
    userId?: string,
  ): Promise<AiProviderCredentialResponseDto> {
    const validation = this.validator.validate(dto.fields, {
      type: dto.type,
      credentialSetName: dto.credentialSetName,
      expiresAt: dto.expiresAt,
      isCreate: true,
    });
    if (!validation.valid) {
      throw new AiProviderCredentialValidationException(validation.errors);
    }

    const conflict = await this.repository.findConflicting({
      providerKey: dto.providerKey,
      workspaceId,
      accountId: dto.accountId,
      modelId: dto.modelId,
    });
    if (conflict) {
      throw new AiProviderCredentialDuplicateException(
        this.describeScope(dto.providerKey, workspaceId, dto.accountId, dto.modelId),
      );
    }

    const version = await this.repository.getNextVersion({
      providerKey: dto.providerKey,
      workspaceId,
      accountId: dto.accountId,
      modelId: dto.modelId,
    });

    const encryptedFields = this.encryptor.encryptFields(dto.fields, workspaceId, dto.providerKey);

    const raw = await this.repository.createCredential({
      workspaceId,
      providerKey: dto.providerKey,
      modelId: dto.modelId ?? null,
      accountId: dto.accountId ?? null,
      credentialSetName: dto.credentialSetName,
      description: dto.description ?? null,
      type: dto.type,
      status: CredentialStatus.PENDING_VALIDATION,
      version,
      encryptedFields,
      encryptionVersion: AI_CREDENTIAL_CONSTANTS.ENCRYPTION_VERSION,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    await this.audit.logChange(this.toEntity(raw), 'Created', userId);
    this.publishEvent(AiProviderEventType.CREDENTIAL_CREATED, raw, userId);

    return AiProviderCredentialResponseDto.from(raw);
  }

  // ── Read ──────────────────────────────────────────────────

  async findAll(
    workspaceId: string,
    filter: AiProviderCredentialFilterDto,
  ): Promise<PaginatedAiProviderCredentialResponseDto> {
    const page = filter.page ?? 1;
    const limit = Math.min(
      filter.limit ?? AI_CREDENTIAL_CONSTANTS.DEFAULT_PAGE_SIZE,
      AI_CREDENTIAL_CONSTANTS.MAX_PAGE_SIZE,
    );
    const [items, total] = await this.repository.findCredentials(workspaceId, { ...filter, page, limit });
    return PaginatedAiProviderCredentialResponseDto.from(items, total, page, limit);
  }

  async findById(id: string, workspaceId: string): Promise<AiProviderCredentialResponseDto> {
    const raw = await this.findOrFail(id, workspaceId);
    return AiProviderCredentialResponseDto.from(raw);
  }

  // ── Update ────────────────────────────────────────────────

  async update(
    id: string,
    workspaceId: string,
    dto: UpdateAiProviderCredentialDto,
    userId?: string,
  ): Promise<AiProviderCredentialResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    this.assertMutable(existing);

    if (dto.fields && Object.keys(dto.fields).length > 0) {
      const validation = this.validator.validate(dto.fields, {
        type: existing['type'] as CredentialType,
        isCreate: false,
      });
      if (!validation.valid) {
        throw new AiProviderCredentialValidationException(validation.errors);
      }
    }

    // Only the supplied field keys are re-encrypted and merged in — this
    // never requires decrypting the untouched pre-existing fields.
    const newEncryptedFields = dto.fields
      ? this.encryptor.encryptFields(dto.fields, workspaceId, existing['providerKey'] as string)
      : {};
    const mergedEncryptedFields = {
      ...(existing['encryptedFields'] as Record<string, string>),
      ...newEncryptedFields,
    };

    const version = (existing['version'] as number) + 1;
    const raw = await this.repository.updateCredential(id, {
      credentialSetName: dto.credentialSetName ?? existing['credentialSetName'],
      description: dto.description ?? existing['description'],
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : existing['expiresAt'],
      encryptedFields: mergedEncryptedFields,
      version,
      updatedBy: userId ?? null,
    });

    await this.audit.logChange(this.toEntity(raw), 'Updated', userId);
    this.publishEvent(AiProviderEventType.CREDENTIAL_UPDATED, raw, userId);

    return AiProviderCredentialResponseDto.from(raw);
  }

  // ── Rotate / Refresh ──────────────────────────────────────

  async rotate(
    id: string,
    workspaceId: string,
    dto: RotateAiProviderCredentialDto,
    userId?: string,
  ): Promise<AiProviderCredentialResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    this.assertMutable(existing);

    const validation = this.validator.validate(dto.fields, {
      type: existing['type'] as CredentialType,
      isCreate: true,
    });
    if (!validation.valid) {
      throw new AiProviderCredentialValidationException(validation.errors);
    }

    const encryptedFields = this.encryptor.encryptFields(dto.fields, workspaceId, existing['providerKey'] as string);
    const version = (existing['version'] as number) + 1;

    const raw = await this.repository.updateCredential(id, {
      encryptedFields,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : existing['expiresAt'],
      version,
      status: CredentialStatus.PENDING_VALIDATION,
      lastRotatedAt: new Date(),
      updatedBy: userId ?? null,
    });

    await this.audit.logChange(this.toEntity(raw), dto.reason ?? 'Rotated', userId);
    this.publishEvent(AiProviderEventType.CREDENTIAL_ROTATED, raw, userId);

    return AiProviderCredentialResponseDto.from(raw);
  }

  async refresh(
    id: string,
    workspaceId: string,
    dto: RefreshAiProviderCredentialDto,
    userId?: string,
  ): Promise<AiProviderCredentialResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    this.assertMutable(existing);

    if (Object.keys(dto.fields).length === 0) {
      throw new AiProviderCredentialValidationException([
        { field: 'fields', message: 'At least one field is required to refresh a credential', code: 'MISSING_REQUIRED_FIELD' },
      ]);
    }

    // Refresh replaces only the supplied token field(s) (e.g. a freshly
    // issued OAuth access token) — same merge-only-supplied-keys approach
    // as update(), so untouched fields never need to be decrypted.
    const newEncryptedFields = this.encryptor.encryptFields(dto.fields, workspaceId, existing['providerKey'] as string);
    const mergedEncryptedFields = {
      ...(existing['encryptedFields'] as Record<string, string>),
      ...newEncryptedFields,
    };
    const version = (existing['version'] as number) + 1;

    const raw = await this.repository.updateCredential(id, {
      encryptedFields: mergedEncryptedFields,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : existing['expiresAt'],
      version,
      status: CredentialStatus.PENDING_VALIDATION,
      lastRefreshedAt: new Date(),
      updatedBy: userId ?? null,
    });

    await this.audit.logChange(this.toEntity(raw), dto.reason ?? 'Refreshed', userId);
    this.publishEvent(AiProviderEventType.CREDENTIAL_REFRESHED, raw, userId);

    return AiProviderCredentialResponseDto.from(raw);
  }

  // ── Status Transitions ────────────────────────────────────

  async enable(id: string, workspaceId: string, userId?: string): Promise<AiProviderCredentialResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    this.assertTransition(existing, CredentialStatus.ACTIVE);

    const raw = await this.repository.updateCredential(id, {
      status: CredentialStatus.ACTIVE,
      updatedBy: userId ?? null,
    });

    this.publishEvent(AiProviderEventType.CREDENTIAL_ENABLED, raw, userId);
    return AiProviderCredentialResponseDto.from(raw);
  }

  async disable(id: string, workspaceId: string, userId?: string): Promise<AiProviderCredentialResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    this.assertTransition(existing, CredentialStatus.DISABLED);

    const raw = await this.repository.updateCredential(id, {
      status: CredentialStatus.DISABLED,
      updatedBy: userId ?? null,
    });

    this.publishEvent(AiProviderEventType.CREDENTIAL_DISABLED, raw, userId);
    return AiProviderCredentialResponseDto.from(raw);
  }

  async revoke(id: string, workspaceId: string, userId?: string): Promise<AiProviderCredentialResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    this.assertTransition(existing, CredentialStatus.REVOKED);

    const raw = await this.repository.updateCredential(id, {
      status: CredentialStatus.REVOKED,
      updatedBy: userId ?? null,
    });

    this.publishEvent(AiProviderEventType.CREDENTIAL_REVOKED, raw, userId);
    return AiProviderCredentialResponseDto.from(raw);
  }

  async delete(id: string, workspaceId: string): Promise<void> {
    const existing = await this.findOrFail(id, workspaceId);
    await this.repository.softDeleteCredential(id);
    this.publishEvent(AiProviderEventType.CREDENTIAL_DELETED, existing);
  }

  // ── Connection Validation ─────────────────────────────────

  async validateConnection(
    id: string,
    workspaceId: string,
    userId?: string,
  ): Promise<ConnectionValidationResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const result = await this.connectionValidator.validate(existing['providerKey'] as string);

    const raw = await this.repository.updateCredential(id, {
      status: result.valid ? CredentialStatus.ACTIVE : CredentialStatus.VALIDATION_FAILED,
      lastValidatedAt: result.checkedAt,
      updatedBy: userId ?? null,
    });

    this.publishEvent(
      result.valid ? AiProviderEventType.CREDENTIAL_VALIDATION_SUCCEEDED : AiProviderEventType.CREDENTIAL_VALIDATION_FAILED,
      raw,
      userId,
      { message: result.message },
    );

    return result as ConnectionValidationResponseDto;
  }

  // ── History ────────────────────────────────────────────────

  async getHistory(id: string, workspaceId: string): Promise<AiProviderCredentialHistoryResponseDto[]> {
    await this.findOrFail(id, workspaceId);
    const entries = await this.repository.findHistory(id);
    return entries.map((e) => AiProviderCredentialHistoryResponseDto.from(e));
  }

  // ── Cache Management ──────────────────────────────────────

  invalidateCache(providerKey?: string, workspaceId?: string): void {
    if (providerKey) {
      this.cache.invalidateByProvider(providerKey);
    } else if (workspaceId) {
      this.cache.invalidateByWorkspace(workspaceId);
    } else {
      this.cache.flush();
    }
  }

  // ── Helpers ───────────────────────────────────────────────

  private async findOrFail(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const raw = await this.repository.findCredentialById(id, workspaceId);
    if (!raw) {
      throw new ResourceNotFoundException('AI provider credential', id);
    }
    return raw;
  }

  private assertMutable(raw: Record<string, unknown>): void {
    const status = raw['status'] as CredentialStatus;
    if (status === CredentialStatus.REVOKED) {
      throw new AiProviderCredentialRevokedException(raw['id'] as string);
    }
  }

  private assertTransition(raw: Record<string, unknown>, to: CredentialStatus): void {
    const current = raw['status'] as CredentialStatus;
    const allowed = AI_CREDENTIAL_CONSTANTS.ALLOWED_TRANSITIONS[current];
    if (!allowed.includes(to)) {
      throw new AiProviderCredentialInvalidTransitionException(current, to);
    }
  }

  private toEntity(raw: Record<string, unknown>): IAiProviderCredentialEntity {
    return raw as unknown as IAiProviderCredentialEntity;
  }

  private describeScope(
    providerKey: string,
    workspaceId: string,
    accountId?: string,
    modelId?: string,
  ): string {
    const parts = [`provider '${providerKey}'`, `workspace '${workspaceId}'`];
    if (accountId) parts.push(`account '${accountId}'`);
    if (modelId) parts.push(`model '${modelId}'`);
    return parts.join(', ');
  }

  private publishEvent(
    type: AiProviderEventType,
    raw: Record<string, unknown>,
    performedBy?: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.eventEmitter.emit({
      type,
      providerKey: raw['providerKey'] as string,
      workspaceId: raw['workspaceId'] as string,
      occurredAt: new Date(),
      payload: {
        credentialId: raw['id'],
        version: raw['version'],
        performedBy: performedBy ?? 'system',
        ...metadata,
      },
    });
  }
}
