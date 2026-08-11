import { Injectable } from '@nestjs/common';
import {
  CapabilityMetricsSnapshot,
  AggregateCapabilityMetrics,
} from '../interfaces';

@Injectable()
export class MarketplaceCapabilityMetrics {
  private readonly data = new Map<string, CapabilityMetricsSnapshot>();

  private ensure(capabilityKey: string): CapabilityMetricsSnapshot {
    let s = this.data.get(capabilityKey);
    if (!s) {
      s = {
        capabilityKey,
        resolutionRequests: 0,
        validationSuccess: 0,
        validationFailures: 0,
        unsupportedRequests: 0,
        versionMismatches: 0,
        dependencyFailures: 0,
        cacheHits: 0,
        cacheMisses: 0,
      };
      this.data.set(capabilityKey, s);
    }
    return s;
  }

  recordResolutionRequest(capabilityKey: string): void {
    this.ensure(capabilityKey).resolutionRequests++;
  }

  recordValidationSuccess(capabilityKey: string): void {
    this.ensure(capabilityKey).validationSuccess++;
  }

  recordValidationFailure(capabilityKey: string): void {
    this.ensure(capabilityKey).validationFailures++;
  }

  recordUnsupportedRequest(capabilityKey: string): void {
    this.ensure(capabilityKey).unsupportedRequests++;
  }

  recordVersionMismatch(capabilityKey: string): void {
    this.ensure(capabilityKey).versionMismatches++;
  }

  recordDependencyFailure(capabilityKey: string): void {
    this.ensure(capabilityKey).dependencyFailures++;
  }

  recordCacheHit(capabilityKey: string): void {
    this.ensure(capabilityKey).cacheHits++;
  }

  recordCacheMiss(capabilityKey: string): void {
    this.ensure(capabilityKey).cacheMisses++;
  }

  getForCapability(capabilityKey: string): CapabilityMetricsSnapshot {
    return this.ensure(capabilityKey);
  }

  getAll(): Record<string, CapabilityMetricsSnapshot> {
    return Object.fromEntries(this.data.entries());
  }

  getAggregate(): AggregateCapabilityMetrics {
    const snapshots = [...this.data.values()];
    const totalCacheHits = snapshots.reduce((s, v) => s + v.cacheHits, 0);
    const totalCacheMisses = snapshots.reduce((s, v) => s + v.cacheMisses, 0);
    const totalCacheOps = totalCacheHits + totalCacheMisses;
    return {
      totalResolutionRequests: snapshots.reduce((s, v) => s + v.resolutionRequests, 0),
      totalValidationSuccess: snapshots.reduce((s, v) => s + v.validationSuccess, 0),
      totalValidationFailures: snapshots.reduce((s, v) => s + v.validationFailures, 0),
      totalUnsupportedRequests: snapshots.reduce((s, v) => s + v.unsupportedRequests, 0),
      totalVersionMismatches: snapshots.reduce((s, v) => s + v.versionMismatches, 0),
      totalDependencyFailures: snapshots.reduce((s, v) => s + v.dependencyFailures, 0),
      cacheHitRate: totalCacheOps > 0 ? totalCacheHits / totalCacheOps : 0,
      byCapability: this.getAll(),
    };
  }

  reset(capabilityKey?: string): void {
    if (capabilityKey) {
      this.data.delete(capabilityKey);
    } else {
      this.data.clear();
    }
  }
}
