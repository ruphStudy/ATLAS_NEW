import { Injectable, Logger } from '@nestjs/common';
import { MarketplaceProviderMetrics, MarketplaceHealthStatus } from '../interfaces';

/**
 * Records in-memory metrics for marketplace provider usage.
 * In production, flush to Prometheus, CloudWatch, or Datadog.
 */
@Injectable()
export class MarketplaceMetricsRecorder {
  private readonly logger = new Logger(MarketplaceMetricsRecorder.name);
  private readonly metrics = new Map<string, MarketplaceProviderMetrics>();

  record(options: {
    providerKey: string;
    accountId?: string | null;
    success: boolean;
    latencyMs: number;
    retried?: boolean;
    rateLimitHit?: boolean;
    healthStatus?: MarketplaceHealthStatus;
  }): void {
    const key = this.metricsKey(options.providerKey, options.accountId);
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        providerKey: options.providerKey,
        accountId: options.accountId,
        totalRequests: 0,
        successCount: 0,
        failureCount: 0,
        retryCount: 0,
        averageLatencyMs: 0,
        rateLimitEventCount: 0,
        healthStatus: MarketplaceHealthStatus.UNKNOWN,
        lastCheckedAt: undefined,
      });
    }

    const m = this.metrics.get(key)!;
    m.totalRequests++;
    if (options.success) m.successCount++;
    else m.failureCount++;
    if (options.retried) m.retryCount++;
    if (options.rateLimitHit) m.rateLimitEventCount++;
    if (options.healthStatus) m.healthStatus = options.healthStatus;

    // Rolling average latency
    m.averageLatencyMs =
      (m.averageLatencyMs * (m.totalRequests - 1) + options.latencyMs) / m.totalRequests;
    m.lastCheckedAt = new Date();
  }

  get(providerKey: string, accountId?: string | null): MarketplaceProviderMetrics | null {
    return this.metrics.get(this.metricsKey(providerKey, accountId)) ?? null;
  }

  getAll(): MarketplaceProviderMetrics[] {
    return Array.from(this.metrics.values());
  }

  reset(providerKey: string, accountId?: string | null): void {
    this.metrics.delete(this.metricsKey(providerKey, accountId));
  }

  private metricsKey(providerKey: string, accountId?: string | null): string {
    return accountId
      ? `${providerKey.toUpperCase()}:${accountId}`
      : providerKey.toUpperCase();
  }
}
