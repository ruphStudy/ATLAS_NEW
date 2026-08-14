import { Injectable } from '@nestjs/common';
import { CachedChannel, CachedChannelSet, IChannel } from '../interfaces';
import { MULTI_CHANNEL_CONSTANTS } from '../constants';

/**
 * MultiChannelCache
 *
 * Two partitioned in-memory caches, mirroring `MultiBrandCache`/`TaxCache`:
 *  1. Channel sets (by workspace, the routing pool)
 *  2. Individual channels (by workspace + channelKey)
 *
 * Both are invalidated whenever a channel is registered, updated,
 * enabled, disabled, archived or restored.
 */
@Injectable()
export class MultiChannelCache {
  private readonly channelSets = new Map<string, CachedChannelSet>();
  private readonly channels = new Map<string, CachedChannel>();

  // ── Channel Set Cache ─────────────────────────────────────

  static buildChannelSetKey(workspaceId: string, businessId?: string | null, brandId?: string | null): string {
    return ['channelset', workspaceId, businessId ?? 'any', brandId ?? 'any'].join(':');
  }

  setChannelSet(key: string, channels: IChannel[]): void {
    this.evictIfFull(this.channelSets);
    this.channelSets.set(key, { channels, cachedAt: Date.now() });
  }

  getChannelSet(key: string): IChannel[] | null {
    const entry = this.channelSets.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > MULTI_CHANNEL_CONSTANTS.CACHE_TTL_MS) {
      this.channelSets.delete(key);
      return null;
    }
    return entry.channels;
  }

  invalidateChannelSetsByWorkspace(workspaceId: string): void {
    const segment = `:${workspaceId}:`;
    for (const k of this.channelSets.keys()) {
      if (k.includes(segment)) this.channelSets.delete(k);
    }
  }

  invalidateAllChannelSets(): void {
    this.channelSets.clear();
  }

  // ── Individual Channel Cache ──────────────────────────────

  static buildChannelKey(workspaceId: string, channelKey: string): string {
    return `channel:${workspaceId}:${channelKey.toUpperCase()}`;
  }

  setChannel(channel: IChannel): void {
    this.evictIfFull(this.channels);
    this.channels.set(MultiChannelCache.buildChannelKey(channel.workspaceId, channel.channelKey), { channel, cachedAt: Date.now() });
  }

  getChannel(workspaceId: string, channelKey: string): IChannel | null {
    const key = MultiChannelCache.buildChannelKey(workspaceId, channelKey);
    const entry = this.channels.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > MULTI_CHANNEL_CONSTANTS.CACHE_TTL_MS) {
      this.channels.delete(key);
      return null;
    }
    return entry.channel;
  }

  invalidateChannel(workspaceId: string, channelKey: string): void {
    this.channels.delete(MultiChannelCache.buildChannelKey(workspaceId, channelKey));
  }

  invalidateChannelsByWorkspace(workspaceId: string): void {
    const prefix = `channel:${workspaceId}:`;
    for (const k of this.channels.keys()) {
      if (k.startsWith(prefix)) this.channels.delete(k);
    }
  }

  // ── Bulk Operations ───────────────────────────────────────

  flush(): void {
    this.channelSets.clear();
    this.channels.clear();
  }

  get channelSetSize(): number {
    return this.channelSets.size;
  }

  get channelSize(): number {
    return this.channels.size;
  }

  // ── LRU Eviction ───────────────────────────────────────────

  private evictIfFull(map: Map<string, { cachedAt: number }>): void {
    if (map.size < MULTI_CHANNEL_CONSTANTS.CACHE_MAX_ENTRIES) return;
    const entries = [...map.entries()].sort((a, b) => a[1].cachedAt - b[1].cachedAt);
    const evictCount = Math.ceil(MULTI_CHANNEL_CONSTANTS.CACHE_MAX_ENTRIES * 0.1);
    for (let i = 0; i < evictCount; i++) {
      map.delete(entries[i][0]);
    }
  }
}
