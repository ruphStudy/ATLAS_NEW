import { Injectable, Logger } from '@nestjs/common';
import { AiProviderEventType, IAiProviderEvent } from '../../../ai/interfaces';
import { AiProviderEventEmitter } from '../../../ai/events/ai-provider-event.emitter';
import { ICachedAiProviderInstance } from '../interfaces';
import { AI_PROVIDER_FACTORY_CONSTANTS } from '../constants';

/**
 * Every event type that can invalidate a cached provider instance:
 * configuration changes, credential changes, registry entry changes
 * (capability/model/status/priority edits), and Foundation-level
 * provider (un)registration.
 */
const INVALIDATING_EVENTS: AiProviderEventType[] = [
  AiProviderEventType.CONFIG_UPDATED,
  AiProviderEventType.CONFIG_PUBLISHED,
  AiProviderEventType.CONFIG_ENABLED,
  AiProviderEventType.CONFIG_DISABLED,
  AiProviderEventType.CONFIG_ARCHIVED,
  AiProviderEventType.CONFIG_DELETED,
  AiProviderEventType.CONFIG_ROLLED_BACK,
  AiProviderEventType.CREDENTIAL_UPDATED,
  AiProviderEventType.CREDENTIAL_ROTATED,
  AiProviderEventType.CREDENTIAL_REFRESHED,
  AiProviderEventType.CREDENTIAL_ENABLED,
  AiProviderEventType.CREDENTIAL_DISABLED,
  AiProviderEventType.CREDENTIAL_REVOKED,
  AiProviderEventType.CREDENTIAL_EXPIRED,
  AiProviderEventType.CREDENTIAL_DELETED,
  AiProviderEventType.REGISTRY_ENTRY_UPDATED,
  AiProviderEventType.REGISTRY_ENTRY_ENABLED,
  AiProviderEventType.REGISTRY_ENTRY_DISABLED,
  AiProviderEventType.REGISTRY_ENTRY_ARCHIVED,
  AiProviderEventType.REGISTRY_ENTRY_SYNCED,
  AiProviderEventType.PROVIDER_REGISTERED,
  AiProviderEventType.PROVIDER_UNREGISTERED,
];

/**
 * AiProviderFactoryInstanceCache
 *
 * Caches initialized `IAiProvider` instances, keyed by resolution
 * criteria. Unlike the criteria-keyed caches in the Configuration/
 * Credentials/Registry modules, each entry also records the exact
 * `providerKey` it resolved to (plus the config/credential/registry
 * version fingerprint it was built from), so a provider-scoped mutation
 * can evict precisely the entries that depend on it instead of flushing
 * everything.
 */
@Injectable()
export class AiProviderFactoryInstanceCache {
  private readonly logger = new Logger(AiProviderFactoryInstanceCache.name);
  private readonly cache = new Map<string, ICachedAiProviderInstance>();

  constructor(private readonly eventEmitter: AiProviderEventEmitter) {
    for (const type of INVALIDATING_EVENTS) {
      this.eventEmitter.on(type, (event) => this.onMutationEvent(event));
    }
  }

  set(key: string, entry: Omit<ICachedAiProviderInstance, 'cachedAt' | 'ttlMs'>): void {
    if (this.cache.size >= AI_PROVIDER_FACTORY_CONSTANTS.CACHE_MAX_ENTRIES) {
      const oldest = this.cache.keys().next().value as string | undefined;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(key, { ...entry, cachedAt: new Date(), ttlMs: AI_PROVIDER_FACTORY_CONSTANTS.CACHE_TTL_MS });
  }

  get(key: string): ICachedAiProviderInstance | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.cachedAt.getTime() > cached.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return cached;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidateByProvider(providerKey: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.providerKey === providerKey) {
        this.cache.delete(key);
      }
    }
  }

  invalidateByWorkspace(workspaceId: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.workspaceId === workspaceId) {
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
    workspaceId: string,
    capability: string,
    useCase?: string,
    modelId?: string,
    region?: string,
    preferredProviderKey?: string,
  ): string {
    return [
      workspaceId,
      capability,
      useCase ?? 'ANY',
      modelId ?? 'ANY',
      region ?? 'ANY',
      preferredProviderKey ?? 'ANY',
    ].join(':');
  }

  private onMutationEvent(event: IAiProviderEvent): void {
    const evicted: string[] = [];
    for (const [key, entry] of this.cache.entries()) {
      if (entry.providerKey === event.providerKey) {
        this.cache.delete(key);
        evicted.push(key);
      }
    }
    if (evicted.length === 0) return;

    this.logger.debug(
      `Evicted ${evicted.length} cached AI provider instance(s) for '${event.providerKey}' due to ${event.type}`,
    );
    this.eventEmitter.emit({
      type: AiProviderEventType.FACTORY_CACHE_INVALIDATED,
      providerKey: event.providerKey,
      workspaceId: event.workspaceId,
      occurredAt: new Date(),
      payload: { causedBy: event.type, evictedCount: evicted.length },
    });
  }
}
