import { Injectable, Logger } from '@nestjs/common';
import { AiProviderEventType } from '../../ai/interfaces';
import { AiProviderEventEmitter } from '../../ai/events/ai-provider-event.emitter';
import { AiProviderCredentialRepository } from './ai-provider-credential.repository';
import { AiProviderCredentialCache } from './cache/ai-provider-credential.cache';
import { AiProviderCredentialDecryptor } from './decryptor/ai-provider-credential.decryptor';
import { AiProviderCredentialConnectionValidator } from './connection/ai-provider-credential-connection.validator';
import {
  CredentialStatus,
  DecryptedCredentialBag,
  IAiCredentialResolutionCriteria,
  IAiProviderCredentialEntity,
} from './interfaces';

interface IResolutionTier {
  accountId?: string;
  modelId?: string;
}

/**
 * AiProviderCredentialResolver
 *
 * Cross-module facade for resolving the active credential for a
 * workspace/provider/model(/account), cache-first, with progressively
 * broader fallback (model+account -> account -> provider-only) and lazy
 * expiry detection. `resolveDecrypted` is the ONLY place plaintext leaves
 * this module's boundary — callers must be trusted internal backend code
 * (e.g. a concrete AI provider implementation resolving its own
 * `credentialRef`), never a controller.
 */
@Injectable()
export class AiProviderCredentialResolver {
  private readonly logger = new Logger(AiProviderCredentialResolver.name);

  constructor(
    private readonly repository: AiProviderCredentialRepository,
    private readonly cache: AiProviderCredentialCache,
    private readonly decryptor: AiProviderCredentialDecryptor,
    private readonly connectionValidator: AiProviderCredentialConnectionValidator,
    private readonly eventEmitter: AiProviderEventEmitter,
  ) {}

  async resolve(criteria: IAiCredentialResolutionCriteria): Promise<IAiProviderCredentialEntity | null> {
    const cacheKey = AiProviderCredentialCache.buildKey(
      criteria.providerKey,
      criteria.workspaceId,
      criteria.accountId,
      criteria.modelId,
    );
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const tiers: IResolutionTier[] = [{ accountId: criteria.accountId, modelId: criteria.modelId }];
    if (criteria.accountId || criteria.modelId) {
      tiers.push({ accountId: criteria.accountId });
    }
    tiers.push({});

    for (const tier of tiers) {
      const raw = await this.repository.findActiveByScope({
        providerKey: criteria.providerKey,
        workspaceId: criteria.workspaceId,
        accountId: tier.accountId,
        modelId: tier.modelId,
      });
      if (!raw) continue;

      const entity = raw as unknown as IAiProviderCredentialEntity;
      if (entity.expiresAt && entity.expiresAt.getTime() <= Date.now()) {
        await this.markExpired(entity);
        continue;
      }

      this.cache.set(cacheKey, entity);
      return entity;
    }

    return null;
  }

  /**
   * SECURITY: returns decrypted plaintext field values. Only for trusted
   * internal consumption (e.g. a concrete AI provider implementation);
   * never expose this through an HTTP endpoint.
   */
  async resolveDecrypted(criteria: IAiCredentialResolutionCriteria): Promise<DecryptedCredentialBag | null> {
    const entity = await this.resolve(criteria);
    if (!entity) return null;
    return this.decryptor.decryptCredential(entity);
  }

  async validateActive(criteria: IAiCredentialResolutionCriteria): Promise<boolean> {
    const entity = await this.resolve(criteria);
    if (!entity) return false;
    const result = await this.connectionValidator.validate(entity.providerKey);
    return result.valid;
  }

  private async markExpired(entity: IAiProviderCredentialEntity): Promise<void> {
    try {
      await this.repository.updateCredential(entity.id, { status: CredentialStatus.EXPIRED });
      this.eventEmitter.emit({
        type: AiProviderEventType.CREDENTIAL_EXPIRED,
        providerKey: entity.providerKey,
        workspaceId: entity.workspaceId,
        occurredAt: new Date(),
        payload: { credentialId: entity.id },
      });
    } catch (err) {
      this.logger.error(`Failed to mark expired AI provider credential '${entity.id}'`, {
        error: (err as Error).message,
      });
    }
  }
}
