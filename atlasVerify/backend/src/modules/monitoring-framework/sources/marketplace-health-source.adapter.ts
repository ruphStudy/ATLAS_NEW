import { Injectable } from '@nestjs/common';
import { MarketplaceHealthService } from '@modules/marketplace-health/marketplace-health.service';
import { MarketplaceHealthState } from '@modules/marketplace-health/interfaces';
import { IMonitoringSignal, IMonitoringSourceAdapter, IMonitoringSourceContext, MonitoringHealthLevel } from '../interfaces';

const LEVEL_MAP: Record<MarketplaceHealthState, MonitoringHealthLevel> = {
  [MarketplaceHealthState.HEALTHY]: MonitoringHealthLevel.HEALTHY,
  [MarketplaceHealthState.DEGRADED]: MonitoringHealthLevel.DEGRADED,
  [MarketplaceHealthState.UNHEALTHY]: MonitoringHealthLevel.UNHEALTHY,
  [MarketplaceHealthState.OFFLINE]: MonitoringHealthLevel.OFFLINE,
  [MarketplaceHealthState.MAINTENANCE]: MonitoringHealthLevel.MAINTENANCE,
};

/** Wraps `MarketplaceHealthService` — reads its already-computed per-provider dashboard, never re-gathers the underlying connection/auth checks. One signal per provider account, preserving the provider dimension. */
@Injectable()
export class MarketplaceHealthSourceAdapter implements IMonitoringSourceAdapter {
  readonly sourceKey = 'MARKETPLACE_HEALTH';

  constructor(private readonly marketplaceHealthService: MarketplaceHealthService) {}

  async collect(context: IMonitoringSourceContext): Promise<IMonitoringSignal[]> {
    if (!context.workspaceId) return [];
    const entries = await this.marketplaceHealthService.getDashboard(context.workspaceId);

    return entries.map((entry) => ({
      sourceKey: this.sourceKey,
      workspaceId: entry.workspaceId,
      provider: entry.providerKey,
      level: LEVEL_MAP[entry.healthState] ?? MonitoringHealthLevel.UNKNOWN,
      latencyMs: entry.responseTimeMs ?? undefined,
      retries: entry.consecutiveFailures,
      checkedAt: entry.checkedAt ?? new Date(),
      raw: { connectionStatus: entry.connectionStatus, authStatus: entry.authStatus, apiReachable: entry.apiReachable },
    }));
  }
}
