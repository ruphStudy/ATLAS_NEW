import { Injectable } from '@nestjs/common';
import { FactoryMetricsSnapshot } from '../interfaces';

interface PerProviderMetrics {
  requests: number;
  instancesCreated: number;
  instancesReused: number;
  cacheHits: number;
  cacheMisses: number;
  initializationFailures: number;
  fallbackUsageCount: number;
  providerResolutionFailures: number;
  credentialResolutionFailures: number;
  totalInitTimeMs: number;
  initCount: number;
}

function emptyMetrics(): PerProviderMetrics {
  return {
    requests: 0,
    instancesCreated: 0,
    instancesReused: 0,
    cacheHits: 0,
    cacheMisses: 0,
    initializationFailures: 0,
    fallbackUsageCount: 0,
    providerResolutionFailures: 0,
    credentialResolutionFailures: 0,
    totalInitTimeMs: 0,
    initCount: 0,
  };
}

/**
 * Records per-provider factory metrics in memory.
 * Provides both per-provider and aggregated snapshots.
 */
@Injectable()
export class MarketplaceProviderFactoryMetrics {
  private readonly metrics = new Map<string, PerProviderMetrics>();

  private getOrCreate(providerKey: string): PerProviderMetrics {
    const key = providerKey.toUpperCase();
    if (!this.metrics.has(key)) this.metrics.set(key, emptyMetrics());
    return this.metrics.get(key)!;
  }

  recordRequest(providerKey: string): void { this.getOrCreate(providerKey).requests += 1; }
  recordInstanceCreated(providerKey: string): void { this.getOrCreate(providerKey).instancesCreated += 1; }
  recordInstanceReused(providerKey: string): void { this.getOrCreate(providerKey).instancesReused += 1; }
  recordCacheHit(providerKey: string): void { this.getOrCreate(providerKey).cacheHits += 1; }
  recordCacheMiss(providerKey: string): void { this.getOrCreate(providerKey).cacheMisses += 1; }
  recordInitializationFailure(providerKey: string): void { this.getOrCreate(providerKey).initializationFailures += 1; }
  recordFallbackUsage(providerKey: string): void { this.getOrCreate(providerKey).fallbackUsageCount += 1; }
  recordProviderResolutionFailure(providerKey: string): void { this.getOrCreate(providerKey).providerResolutionFailures += 1; }
  recordCredentialResolutionFailure(providerKey: string): void { this.getOrCreate(providerKey).credentialResolutionFailures += 1; }

  recordInitTime(providerKey: string, elapsedMs: number): void {
    const m = this.getOrCreate(providerKey);
    m.totalInitTimeMs += elapsedMs;
    m.initCount += 1;
  }

  getForProvider(providerKey: string): FactoryMetricsSnapshot {
    const m = this.getOrCreate(providerKey);
    return this.toSnapshot(m);
  }

  getAll(): Record<string, FactoryMetricsSnapshot> {
    const result: Record<string, FactoryMetricsSnapshot> = {};
    for (const [key, m] of this.metrics.entries()) {
      result[key] = this.toSnapshot(m);
    }
    return result;
  }

  getAggregate(): FactoryMetricsSnapshot {
    let agg = emptyMetrics();
    for (const m of this.metrics.values()) {
      agg.requests += m.requests;
      agg.instancesCreated += m.instancesCreated;
      agg.instancesReused += m.instancesReused;
      agg.cacheHits += m.cacheHits;
      agg.cacheMisses += m.cacheMisses;
      agg.initializationFailures += m.initializationFailures;
      agg.fallbackUsageCount += m.fallbackUsageCount;
      agg.providerResolutionFailures += m.providerResolutionFailures;
      agg.credentialResolutionFailures += m.credentialResolutionFailures;
      agg.totalInitTimeMs += m.totalInitTimeMs;
      agg.initCount += m.initCount;
    }
    return this.toSnapshot(agg);
  }

  reset(providerKey?: string): void {
    if (providerKey) {
      this.metrics.set(providerKey.toUpperCase(), emptyMetrics());
    } else {
      this.metrics.clear();
    }
  }

  private toSnapshot(m: PerProviderMetrics): FactoryMetricsSnapshot {
    return {
      totalRequests: m.requests,
      instancesCreated: m.instancesCreated,
      instancesReused: m.instancesReused,
      cacheHits: m.cacheHits,
      cacheMisses: m.cacheMisses,
      initializationFailures: m.initializationFailures,
      fallbackUsageCount: m.fallbackUsageCount,
      providerResolutionFailures: m.providerResolutionFailures,
      credentialResolutionFailures: m.credentialResolutionFailures,
      averageInitTimeMs: m.initCount > 0 ? Math.round(m.totalInitTimeMs / m.initCount) : 0,
    };
  }
}
