import { Injectable, Logger } from '@nestjs/common';
import { AiProviderEventType, IAiProviderEvent } from '../../../ai/interfaces';
import { AiProviderEventEmitter } from '../../../ai/events/ai-provider-event.emitter';
import {
  ICachedAiCapabilityDefinition,
  ICachedAiCapabilityResolution,
  IAiCapabilityDefinitionEntity,
  IAiCapabilityResolutionResult,
} from '../interfaces';
import { AI_CAPABILITY_CONSTANTS } from '../constants';

const DEFINITION_MUTATION_EVENTS: AiProviderEventType[] = [
  AiProviderEventType.CAPABILITY_UPDATED,
  AiProviderEventType.CAPABILITY_VERSIONED,
  AiProviderEventType.CAPABILITY_ENABLED,
  AiProviderEventType.CAPABILITY_DISABLED,
];

const OVERRIDE_MUTATION_EVENTS: AiProviderEventType[] = [
  AiProviderEventType.CAPABILITY_OVERRIDE_REGISTERED,
  AiProviderEventType.CAPABILITY_OVERRIDE_UPDATED,
  AiProviderEventType.CAPABILITY_OVERRIDE_DISABLED,
];

/** Upstream changes that can shift a resolution outcome without a capability-specific event. */
const UPSTREAM_INVALIDATING_EVENTS: AiProviderEventType[] = [
  AiProviderEventType.REGISTRY_ENTRY_UPDATED,
  AiProviderEventType.REGISTRY_ENTRY_ENABLED,
  AiProviderEventType.REGISTRY_ENTRY_DISABLED,
  AiProviderEventType.REGISTRY_ENTRY_ARCHIVED,
  AiProviderEventType.REGISTRY_ENTRY_SYNCED,
  AiProviderEventType.CONFIG_UPDATED,
  AiProviderEventType.CONFIG_PUBLISHED,
  AiProviderEventType.CONFIG_DISABLED,
  AiProviderEventType.CONFIG_ARCHIVED,
  AiProviderEventType.CREDENTIAL_UPDATED,
  AiProviderEventType.CREDENTIAL_ROTATED,
  AiProviderEventType.CREDENTIAL_REVOKED,
  AiProviderEventType.CREDENTIAL_EXPIRED,
  AiProviderEventType.CREDENTIAL_DELETED,
];

/**
 * AiCapabilityCache
 *
 * Caches both capability DEFINITIONS (by capabilityKey) and RESOLUTION
 * results (by resolution criteria). Definition/override mutation events
 * carry `capabilityKey` in their payload (the shared `providerKey` field
 * on `IAiProviderEvent` isn't always a real provider key at this scope —
 * GLOBAL/WORKSPACE overrides and definition changes aren't tied to one)
 * so invalidation reads from `payload.capabilityKey`, falling back to
 * `providerKey` for compatibility. Upstream registry/configuration/
 * credential events (which use a real `providerKey`) evict resolution
 * entries that were resolved against that provider.
 */
@Injectable()
export class AiCapabilityCache {
  private readonly logger = new Logger(AiCapabilityCache.name);
  private readonly definitions = new Map<string, ICachedAiCapabilityDefinition>();
  private readonly resolutions = new Map<string, ICachedAiCapabilityResolution>();

  constructor(private readonly eventEmitter: AiProviderEventEmitter) {
    for (const type of DEFINITION_MUTATION_EVENTS) {
      this.eventEmitter.on(type, (event) => this.onDefinitionEvent(event));
    }
    for (const type of OVERRIDE_MUTATION_EVENTS) {
      this.eventEmitter.on(type, (event) => this.onOverrideEvent(event));
    }
    for (const type of UPSTREAM_INVALIDATING_EVENTS) {
      this.eventEmitter.on(type, (event) => this.onUpstreamEvent(event));
    }
  }

  // ── Definitions ───────────────────────────────────────────

  setDefinition(capabilityKey: string, definition: IAiCapabilityDefinitionEntity): void {
    this.evictOldestIfFull(this.definitions);
    this.definitions.set(capabilityKey, {
      definition,
      cachedAt: new Date(),
      ttlMs: AI_CAPABILITY_CONSTANTS.DEFINITION_CACHE_TTL_MS,
    });
  }

  getDefinition(capabilityKey: string): IAiCapabilityDefinitionEntity | null {
    const cached = this.definitions.get(capabilityKey);
    if (!cached) return null;
    if (Date.now() - cached.cachedAt.getTime() > cached.ttlMs) {
      this.definitions.delete(capabilityKey);
      return null;
    }
    return cached.definition;
  }

  invalidateDefinition(capabilityKey: string): void {
    this.definitions.delete(capabilityKey);
  }

  // ── Resolutions ───────────────────────────────────────────

  setResolution(key: string, result: IAiCapabilityResolutionResult): void {
    this.evictOldestIfFull(this.resolutions);
    this.resolutions.set(key, {
      result,
      cachedAt: new Date(),
      ttlMs: AI_CAPABILITY_CONSTANTS.RESOLUTION_CACHE_TTL_MS,
    });
  }

  getResolution(key: string): IAiCapabilityResolutionResult | null {
    const cached = this.resolutions.get(key);
    if (!cached) return null;
    if (Date.now() - cached.cachedAt.getTime() > cached.ttlMs) {
      this.resolutions.delete(key);
      return null;
    }
    return cached.result;
  }

  invalidateResolutionsByCapability(capabilityKey: string): void {
    for (const [key, cached] of this.resolutions.entries()) {
      if (cached.result.capabilityKey === capabilityKey) {
        this.resolutions.delete(key);
      }
    }
  }

  invalidateResolutionsByProvider(providerKey: string): void {
    for (const [key, cached] of this.resolutions.entries()) {
      if (cached.result.providerKey === providerKey) {
        this.resolutions.delete(key);
      }
    }
  }

  flush(): void {
    this.definitions.clear();
    this.resolutions.clear();
  }

  get definitionCount(): number {
    return this.definitions.size;
  }

  get resolutionCount(): number {
    return this.resolutions.size;
  }

  static buildResolutionKey(
    workspaceId: string,
    capabilityKey: string,
    providerKey?: string,
    modelId?: string,
    useCase?: string,
    region?: string,
  ): string {
    return [workspaceId, capabilityKey, providerKey ?? 'ANY', modelId ?? 'ANY', useCase ?? 'ANY', region ?? 'ANY'].join(
      ':',
    );
  }

  // ── Internals ─────────────────────────────────────────────

  private evictOldestIfFull(map: Map<string, unknown>): void {
    if (map.size >= AI_CAPABILITY_CONSTANTS.CACHE_MAX_ENTRIES) {
      const oldest = map.keys().next().value as string | undefined;
      if (oldest) map.delete(oldest);
    }
  }

  private extractCapabilityKey(event: IAiProviderEvent): string {
    return (event.payload?.['capabilityKey'] as string | undefined) ?? event.providerKey;
  }

  private onDefinitionEvent(event: IAiProviderEvent): void {
    const capabilityKey = this.extractCapabilityKey(event);
    this.invalidateDefinition(capabilityKey);
    this.invalidateResolutionsByCapability(capabilityKey);
    this.emitCacheInvalidated(capabilityKey, event);
  }

  private onOverrideEvent(event: IAiProviderEvent): void {
    const capabilityKey = this.extractCapabilityKey(event);
    this.invalidateResolutionsByCapability(capabilityKey);
    this.emitCacheInvalidated(capabilityKey, event);
  }

  private onUpstreamEvent(event: IAiProviderEvent): void {
    this.invalidateResolutionsByProvider(event.providerKey);
  }

  private emitCacheInvalidated(capabilityKey: string, causedBy: IAiProviderEvent): void {
    this.logger.debug(`Capability cache invalidated for '${capabilityKey}' due to ${causedBy.type}`);
    this.eventEmitter.emit({
      type: AiProviderEventType.CAPABILITY_CACHE_INVALIDATED,
      providerKey: capabilityKey,
      workspaceId: causedBy.workspaceId,
      occurredAt: new Date(),
      payload: { capabilityKey, causedBy: causedBy.type },
    });
  }
}
