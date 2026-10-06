import { Injectable } from '@nestjs/common';
import { IAiCost, IAiTokenUsage } from '../interfaces';

export interface IAiProviderMetricsSnapshot {
  providerKey: string;
  workspaceId: string;
  requestCount: number;
  errorCount: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  totalCostAmount: number;
  currency?: string;
  averageLatencyMs: number;
  lastRequestAt: Date;
}

interface IMetricsEntry extends IAiProviderMetricsSnapshot {
  totalLatencyMs: number;
}

/**
 * AiProviderMetricsService
 *
 * In-memory usage/cost/latency aggregation, keyed by provider + workspace.
 * Mirrors the hand-rolled `Map`-based metrics pattern used elsewhere in the
 * codebase (e.g. `CatalogSyncMetrics`) — no shared metrics infrastructure
 * exists to plug into.
 */
@Injectable()
export class AiProviderMetricsService {
  private readonly data = new Map<string, IMetricsEntry>();

  recordRequest(
    providerKey: string,
    workspaceId: string,
    usage: IAiTokenUsage,
    cost: IAiCost | undefined,
    latencyMs: number,
    success: boolean,
  ): void {
    const key = this.getKey(providerKey, workspaceId);
    const existing = this.data.get(key) ?? this.createEmptyEntry(providerKey, workspaceId);

    existing.requestCount += 1;
    if (!success) {
      existing.errorCount += 1;
    }
    existing.totalPromptTokens += usage.promptTokens;
    existing.totalCompletionTokens += usage.completionTokens;
    existing.totalTokens += usage.totalTokens;
    if (cost) {
      existing.totalCostAmount += cost.amount;
      existing.currency = cost.currency;
    }
    existing.totalLatencyMs += latencyMs;
    existing.averageLatencyMs = existing.totalLatencyMs / existing.requestCount;
    existing.lastRequestAt = new Date();

    this.data.set(key, existing);
  }

  getSnapshot(providerKey: string, workspaceId: string): IAiProviderMetricsSnapshot | null {
    const entry = this.data.get(this.getKey(providerKey, workspaceId));
    return entry ? this.toSnapshot(entry) : null;
  }

  getAllSnapshots(workspaceId?: string): IAiProviderMetricsSnapshot[] {
    return Array.from(this.data.values())
      .filter((entry) => !workspaceId || entry.workspaceId === workspaceId)
      .map((entry) => this.toSnapshot(entry));
  }

  reset(workspaceId?: string): void {
    if (!workspaceId) {
      this.data.clear();
      return;
    }
    for (const [key, entry] of this.data.entries()) {
      if (entry.workspaceId === workspaceId) {
        this.data.delete(key);
      }
    }
  }

  private getKey(providerKey: string, workspaceId: string): string {
    return `${providerKey}:${workspaceId}`;
  }

  private createEmptyEntry(providerKey: string, workspaceId: string): IMetricsEntry {
    return {
      providerKey,
      workspaceId,
      requestCount: 0,
      errorCount: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalTokens: 0,
      totalCostAmount: 0,
      totalLatencyMs: 0,
      averageLatencyMs: 0,
      lastRequestAt: new Date(),
    };
  }

  private toSnapshot(entry: IMetricsEntry): IAiProviderMetricsSnapshot {
    const { totalLatencyMs: _totalLatencyMs, ...snapshot } = entry;
    return snapshot;
  }
}
