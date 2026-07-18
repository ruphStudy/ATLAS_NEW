import { Injectable, Logger } from '@nestjs/common';
import {
  IMarketplaceProviderAdapter,
  MarketplaceHealthResult,
  MarketplaceHealthStatus,
} from '../interfaces';
import { MarketplaceProviderRegistry } from '../registry/marketplace-provider.registry';

export interface MarketplaceHealthSnapshot {
  providerKey: string;
  accountId?: string | null;
  result: MarketplaceHealthResult;
}

/**
 * Polls all registered marketplace providers and caches their health results.
 * Tracks availability, response time, failure rate, and connection status.
 * Business modules call getHealth() to read cached results without triggering live checks.
 */
@Injectable()
export class MarketplaceHealthMonitor {
  private readonly logger = new Logger(MarketplaceHealthMonitor.name);
  private readonly cache = new Map<string, MarketplaceHealthResult>();

  // Simple per-provider stats for failure rate tracking
  private readonly stats = new Map<string, { success: number; failure: number; latencyMs: number[] }>();

  constructor(private readonly registry: MarketplaceProviderRegistry) {}

  /**
   * Runs health checks for all registered active providers.
   */
  async checkAll(): Promise<MarketplaceHealthSnapshot[]> {
    const adapters = this.registry.getActive();
    const results: MarketplaceHealthSnapshot[] = [];

    await Promise.allSettled(
      adapters.map(async (adapter) => {
        const result = await this.checkOne(adapter);
        results.push({ providerKey: adapter.metadata.providerKey, result });
      }),
    );

    return results;
  }

  /**
   * Checks a single provider and updates the cache.
   */
  async checkOne(adapter: IMarketplaceProviderAdapter, accountId?: string): Promise<MarketplaceHealthResult> {
    const cacheKey = this.cacheKey(adapter.metadata.providerKey, accountId);
    try {
      const result = await adapter.healthCheck(accountId);
      this.cache.set(cacheKey, result);
      this.recordStat(adapter.metadata.providerKey, true, result.latencyMs ?? 0);
      this.logger.log(
        `[${adapter.metadata.providerKey}] Health: ${result.status} (${result.latencyMs ?? '?'}ms)`,
      );
      return result;
    } catch (error) {
      const result: MarketplaceHealthResult = {
        providerKey: adapter.metadata.providerKey,
        accountId: accountId ?? null,
        status: MarketplaceHealthStatus.UNHEALTHY,
        latencyMs: undefined,
        message: error instanceof Error ? error.message : 'Unknown error',
        connectionStatus: 'FAILED',
        checkedAt: new Date(),
      };
      this.cache.set(cacheKey, result);
      this.recordStat(adapter.metadata.providerKey, false, 0);
      return result;
    }
  }

  /**
   * Returns the cached health result for a provider (does not re-check).
   */
  getHealth(providerKey: string, accountId?: string): MarketplaceHealthResult | null {
    return this.cache.get(this.cacheKey(providerKey, accountId)) ?? null;
  }

  /**
   * Returns all cached health results.
   */
  getAllHealth(): MarketplaceHealthSnapshot[] {
    const results: MarketplaceHealthSnapshot[] = [];
    for (const [key, result] of this.cache.entries()) {
      results.push({ providerKey: key, result });
    }
    return results;
  }

  /**
   * Returns true if the provider is healthy or status unknown (optimistic default).
   */
  isHealthy(providerKey: string, accountId?: string): boolean {
    const result = this.cache.get(this.cacheKey(providerKey, accountId));
    if (!result) return true;
    return result.status === MarketplaceHealthStatus.HEALTHY;
  }

  /**
   * Returns the failure rate (0–1) for a provider.
   */
  getFailureRate(providerKey: string): number {
    const stat = this.stats.get(providerKey.toUpperCase());
    if (!stat) return 0;
    const total = stat.success + stat.failure;
    if (total === 0) return 0;
    return stat.failure / total;
  }

  /**
   * Returns the average latency in ms for a provider.
   */
  getAverageLatency(providerKey: string): number {
    const stat = this.stats.get(providerKey.toUpperCase());
    if (!stat || stat.latencyMs.length === 0) return 0;
    return stat.latencyMs.reduce((a, b) => a + b, 0) / stat.latencyMs.length;
  }

  /**
   * Clears the health cache for a provider (forces fresh check on next call).
   */
  invalidate(providerKey: string, accountId?: string): void {
    this.cache.delete(this.cacheKey(providerKey, accountId));
  }

  // ── Internals ────────────────────────────────────────────────

  private cacheKey(providerKey: string, accountId?: string): string {
    return accountId
      ? `${providerKey.toUpperCase()}:${accountId}`
      : providerKey.toUpperCase();
  }

  private recordStat(providerKey: string, success: boolean, latencyMs: number): void {
    const key = providerKey.toUpperCase();
    if (!this.stats.has(key)) {
      this.stats.set(key, { success: 0, failure: 0, latencyMs: [] });
    }
    const stat = this.stats.get(key)!;
    if (success) {
      stat.success++;
      // Keep last 100 latency samples
      if (stat.latencyMs.length >= 100) stat.latencyMs.shift();
      stat.latencyMs.push(latencyMs);
    } else {
      stat.failure++;
    }
  }
}
