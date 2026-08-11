import { Injectable, Logger } from '@nestjs/common';
import { AiProviderEventType, IAiProviderEvent } from '../../../ai/interfaces';
import { AiProviderEventEmitter } from '../../../ai/events/ai-provider-event.emitter';
import { ICachedAiProviderConfig, IAiProviderConfigEntity } from '../interfaces';
import { AI_CONFIG_CONSTANTS } from '../constants';

const CONFIG_MUTATION_EVENTS: AiProviderEventType[] = [
  AiProviderEventType.CONFIG_UPDATED,
  AiProviderEventType.CONFIG_PUBLISHED,
  AiProviderEventType.CONFIG_ENABLED,
  AiProviderEventType.CONFIG_DISABLED,
  AiProviderEventType.CONFIG_ARCHIVED,
  AiProviderEventType.CONFIG_DELETED,
  AiProviderEventType.CONFIG_ROLLED_BACK,
];

/**
 * AiProviderConfigCache
 *
 * In-memory cache of resolved/active AI provider configurations, keyed by
 * scope+workspace+provider+useCase+model. Mirrors the `Map`-based cache
 * pattern used elsewhere in this codebase (e.g. `MarketplaceProviderConfigCache`).
 *
 * Invalidation is event-driven: the cache subscribes to
 * `AiProviderEventEmitter` on construction and evicts matching entries
 * whenever a mutating config lifecycle event fires, rather than requiring
 * every call site to remember to invalidate it manually.
 */
@Injectable()
export class AiProviderConfigCache {
  private readonly logger = new Logger(AiProviderConfigCache.name);
  private readonly cache = new Map<string, ICachedAiProviderConfig>();

  constructor(private readonly eventEmitter: AiProviderEventEmitter) {
    for (const type of CONFIG_MUTATION_EVENTS) {
      this.eventEmitter.on(type, (event) => this.onConfigEvent(event));
    }
  }

  set(
    key: string,
    config: IAiProviderConfigEntity,
    ttlMs: number = AI_CONFIG_CONSTANTS.CACHE_TTL_MS,
  ): void {
    if (this.cache.size >= AI_CONFIG_CONSTANTS.CACHE_MAX_ENTRIES) {
      const oldest = this.cache.keys().next().value as string | undefined;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(key, { config, cachedAt: new Date(), ttlMs });
  }

  get(key: string): IAiProviderConfigEntity | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt.getTime() > entry.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.config;
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
    workspaceId?: string | null,
    useCase?: string | null,
    modelId?: string | null,
  ): string {
    return [providerKey, workspaceId ?? 'GLOBAL', useCase ?? 'ANY', modelId ?? 'ANY'].join(':');
  }

  private onConfigEvent(event: IAiProviderEvent): void {
    this.invalidateByProvider(event.providerKey);
    this.logger.debug(
      `Cache invalidated for provider '${event.providerKey}' due to ${event.type}`,
    );
    this.eventEmitter.emit({
      type: AiProviderEventType.CONFIG_CACHE_INVALIDATED,
      providerKey: event.providerKey,
      workspaceId: event.workspaceId,
      occurredAt: new Date(),
      payload: { causedBy: event.type },
    });
  }
}
