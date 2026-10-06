import { Injectable } from '@nestjs/common';
import {
  HealthCheckResult,
  HealthMetricsSnapshot,
  MarketplaceHealthState,
} from '../interfaces';
import { MP_HEALTH_CONSTANTS } from '../constants';

interface ProviderSample {
  responseTimesMs: number[];
  totalChecks: number;
  successChecks: number;
  firstCheckAt?: Date;
  lastCheckAt?: Date;
}

@Injectable()
export class MarketplaceHealthMetrics {
  private readonly samples = new Map<string, ProviderSample>();
  private readonly currentStates = new Map<string, MarketplaceHealthState>();

  private key(workspaceId: string, providerKey: string, accountId?: string | null): string {
    return `${workspaceId}:${providerKey.toUpperCase()}:${accountId ?? 'any'}`;
  }

  private ensure(k: string): ProviderSample {
    let s = this.samples.get(k);
    if (!s) {
      s = { responseTimesMs: [], totalChecks: 0, successChecks: 0 };
      this.samples.set(k, s);
    }
    return s;
  }

  record(result: HealthCheckResult): void {
    const k = this.key(result.workspaceId, result.providerKey, result.accountId);
    const s = this.ensure(k);
    s.totalChecks++;
    s.lastCheckAt = result.checkedAt;
    if (!s.firstCheckAt) s.firstCheckAt = result.checkedAt;

    const isSuccess =
      result.healthState === MarketplaceHealthState.HEALTHY ||
      result.healthState === MarketplaceHealthState.DEGRADED;
    if (isSuccess) s.successChecks++;

    if (result.responseTimeMs != null) {
      s.responseTimesMs.push(result.responseTimeMs);
      if (s.responseTimesMs.length > MP_HEALTH_CONSTANTS.LATENCY_WINDOW) {
        s.responseTimesMs.shift();
      }
    }

    this.currentStates.set(k, result.healthState);
  }

  getSnapshot(
    workspaceId: string,
    providerKey: string,
    accountId?: string | null,
  ): HealthMetricsSnapshot {
    const k = this.key(workspaceId, providerKey, accountId);
    const s = this.samples.get(k);
    const state = this.currentStates.get(k) ?? MarketplaceHealthState.HEALTHY;

    if (!s || s.totalChecks === 0) {
      return {
        providerKey,
        workspaceId,
        uptimePercent: 100,
        avgResponseTimeMs: 0,
        p95ResponseTimeMs: 0,
        successRate: 1,
        failureRate: 0,
        consecutiveFailures: 0,
        totalChecks: 0,
        lastCheckedAt: null,
        currentState: state,
      };
    }

    const successRate = s.successChecks / s.totalChecks;
    const failureRate = 1 - successRate;
    const sorted = [...s.responseTimesMs].sort((a, b) => a - b);
    const avg = sorted.length ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0;
    const p95 = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1] : 0;

    return {
      providerKey,
      workspaceId,
      uptimePercent: successRate * 100,
      avgResponseTimeMs: Math.round(avg),
      p95ResponseTimeMs: p95 ?? 0,
      successRate,
      failureRate,
      consecutiveFailures: 0, // driven by status manager
      totalChecks: s.totalChecks,
      lastCheckedAt: s.lastCheckAt ?? null,
      currentState: state,
    };
  }

  getAllSnapshots(workspaceId: string): HealthMetricsSnapshot[] {
    const results: HealthMetricsSnapshot[] = [];
    for (const k of this.samples.keys()) {
      if (k.startsWith(`${workspaceId}:`)) {
        const [, providerKey, accountId] = k.split(':');
        results.push(this.getSnapshot(workspaceId, providerKey, accountId === 'any' ? null : accountId));
      }
    }
    return results;
  }

  reset(workspaceId?: string, providerKey?: string): void {
    if (!workspaceId) { this.samples.clear(); this.currentStates.clear(); return; }
    for (const k of [...this.samples.keys()]) {
      if (k.startsWith(`${workspaceId}:`) && (!providerKey || k.includes(`:${providerKey.toUpperCase()}:`))) {
        this.samples.delete(k);
        this.currentStates.delete(k);
      }
    }
  }
}
