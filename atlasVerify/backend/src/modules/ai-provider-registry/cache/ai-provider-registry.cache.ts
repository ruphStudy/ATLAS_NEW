import { Injectable, Logger } from '@nestjs/common';
import { AiProviderEventType, IAiProviderEvent } from '../../../ai/interfaces';
import { AiProviderEventEmitter } from '../../../ai/events/ai-provider-event.emitter';
import { ICachedAiProviderRegistryEntity, IAiProviderRegistryEntity } from '../interfaces';
import { AI_PROVIDER_REGISTRY_CONSTANTS } from '../constants';

const REGISTRY_MUTATION_EVENTS: AiProviderEventType[] = [
  AiProviderEventType.REGISTRY_ENTRY_UPDATED,
  AiProviderEventType.REGISTRY_ENTRY_ENABLED,
  AiProviderEventType.REGISTRY_ENTRY_DISABLED,
  AiProviderEventType.REGISTRY_ENTRY_ARCHIVED,
  AiProviderEventType.REGISTRY_ENTRY_SYNCED,
];

/**
 * AiProviderRegistryCache
 *
 * In-memory cache of resolved registry entries, keyed by discovery
 * criteria. Invalidation is event-driven: subscribes to
 * `AiProviderEventEmitter` and evicts matching entries whenever a
 * mutating registry lifecycle event fires.
 */
@Injectable()
export class AiProviderRegistryCache {
  private readonly logger = new Logger(AiProviderRegistryCache.name);
  private readonly cache = new Map<string, ICachedAiProviderRegistryEntity>();

  constructor(private readonly eventEmitter: AiProviderEventEmitter) {
    for (const type of REGISTRY_MUTATION_EVENTS) {
      this.eventEmitter.on(type, (event) => this.onRegistryEvent(event));
    }
  }

  set(
    key: string,
    entry: IAiProviderRegistryEntity,
    ttlMs: number = AI_PROVIDER_REGISTRY_CONSTANTS.CACHE_TTL_MS,
  ): void {
    if (this.cache.size >= AI_PROVIDER_REGISTRY_CONSTANTS.CACHE_MAX_ENTRIES) {
      const oldest = this.cache.keys().next().value as string | undefined;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(key, { entry, cachedAt: new Date(), ttlMs });
  }

  get(key: string): IAiProviderRegistryEntity | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.cachedAt.getTime() > cached.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return cached.entry;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Cache entries are keyed by resolution criteria (workspace + capability
   * + model + region), not by the provider a lookup happened to resolve
   * to, so which entries are "for" a given provider can't be determined
   * from the key alone. A provider-scoped mutation therefore flushes the
   * whole (small, cheap-to-rebuild) cache rather than risk serving a
   * stale resolution.
   */
  invalidateByProvider(_providerKey: string): void {
    this.flush();
  }

  invalidateByWorkspace(workspaceId: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${workspaceId}:`)) {
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
    capability?: string,
    modelId?: string,
    region?: string,
    preferredProviderKey?: string,
  ): string {
    return [
      workspaceId,
      capability ?? 'ANY',
      modelId ?? 'ANY',
      region ?? 'ANY',
      preferredProviderKey ?? 'ANY',
    ].join(':');
  }

  private onRegistryEvent(event: IAiProviderEvent): void {
    this.invalidateByProvider(event.providerKey);
    this.logger.debug(`Registry cache invalidated for provider '${event.providerKey}' due to ${event.type}`);
    this.eventEmitter.emit({
      type: AiProviderEventType.REGISTRY_CACHE_INVALIDATED,
      providerKey: event.providerKey,
      workspaceId: event.workspaceId,
      occurredAt: new Date(),
      payload: { causedBy: event.type },
    });
  }
}
