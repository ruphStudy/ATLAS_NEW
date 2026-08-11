import { Injectable, Logger } from '@nestjs/common';
import { AiProviderEventType, IAiProviderEvent } from '../../../ai/interfaces';
import { AiProviderEventEmitter } from '../../../ai/events/ai-provider-event.emitter';
import { ICachedAiProviderCredential, IAiProviderCredentialEntity } from '../interfaces';
import { AI_CREDENTIAL_CONSTANTS } from '../constants';

const CREDENTIAL_MUTATION_EVENTS: AiProviderEventType[] = [
  AiProviderEventType.CREDENTIAL_UPDATED,
  AiProviderEventType.CREDENTIAL_ROTATED,
  AiProviderEventType.CREDENTIAL_REFRESHED,
  AiProviderEventType.CREDENTIAL_ENABLED,
  AiProviderEventType.CREDENTIAL_DISABLED,
  AiProviderEventType.CREDENTIAL_REVOKED,
  AiProviderEventType.CREDENTIAL_EXPIRED,
  AiProviderEventType.CREDENTIAL_DELETED,
];

/**
 * AiProviderCredentialCache
 *
 * In-memory cache of resolved active credential ENTITIES (still holding
 * `encryptedFields` — decrypted plaintext is never cached). Keyed by
 * provider+workspace+account+model. Invalidation is event-driven: the
 * cache subscribes to `AiProviderEventEmitter` and evicts matching
 * entries whenever a mutating credential lifecycle event fires.
 */
@Injectable()
export class AiProviderCredentialCache {
  private readonly logger = new Logger(AiProviderCredentialCache.name);
  private readonly cache = new Map<string, ICachedAiProviderCredential>();

  constructor(private readonly eventEmitter: AiProviderEventEmitter) {
    for (const type of CREDENTIAL_MUTATION_EVENTS) {
      this.eventEmitter.on(type, (event) => this.onCredentialEvent(event));
    }
  }

  set(
    key: string,
    credential: IAiProviderCredentialEntity,
    ttlMs: number = AI_CREDENTIAL_CONSTANTS.CACHE_TTL_MS,
  ): void {
    if (this.cache.size >= AI_CREDENTIAL_CONSTANTS.CACHE_MAX_ENTRIES) {
      const oldest = this.cache.keys().next().value as string | undefined;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(key, { credential, cachedAt: new Date(), ttlMs });
  }

  get(key: string): IAiProviderCredentialEntity | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt.getTime() > entry.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.credential;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidateByProvider(providerKey: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${providerKey}:`)) {
        this.cache.delete(key);
      }
    }
  }

  invalidateByWorkspace(workspaceId: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(`:${workspaceId}:`)) {
        this.cache.delete(key);
      }
    }
  }

  flush(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  static buildKey(
    providerKey: string,
    workspaceId: string,
    accountId?: string | null,
    modelId?: string | null,
  ): string {
    return [providerKey, workspaceId, accountId ?? 'ANY', modelId ?? 'ANY'].join(':');
  }

  private onCredentialEvent(event: IAiProviderEvent): void {
    this.invalidateByProvider(event.providerKey);
    this.logger.debug(`Cache invalidated for provider '${event.providerKey}' due to ${event.type}`);
    this.eventEmitter.emit({
      type: AiProviderEventType.CREDENTIAL_CACHE_INVALIDATED,
      providerKey: event.providerKey,
      workspaceId: event.workspaceId,
      occurredAt: new Date(),
      payload: { causedBy: event.type },
    });
  }
}
