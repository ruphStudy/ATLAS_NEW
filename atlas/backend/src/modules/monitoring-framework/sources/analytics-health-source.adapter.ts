import { Injectable } from '@nestjs/common';
import { AnalyticsHealthService } from '@modules/analytics-health/analytics-health.service';
import { HealthStatus } from '@modules/analytics-health/interfaces';
import { IMonitoringSignal, IMonitoringSourceAdapter, IMonitoringSourceContext, MonitoringHealthLevel } from '../interfaces';

const LEVEL_MAP: Record<HealthStatus, MonitoringHealthLevel> = {
  [HealthStatus.HEALTHY]: MonitoringHealthLevel.HEALTHY,
  [HealthStatus.DEGRADED]: MonitoringHealthLevel.DEGRADED,
  [HealthStatus.FAILED]: MonitoringHealthLevel.UNHEALTHY,
  [HealthStatus.UNKNOWN]: MonitoringHealthLevel.UNKNOWN,
};

/** Wraps `AnalyticsHealthService` — reads its already-computed workspace/system health summary, never re-gathers the underlying analytics-service checks. */
@Injectable()
export class AnalyticsHealthSourceAdapter implements IMonitoringSourceAdapter {
  readonly sourceKey = 'ANALYTICS_HEALTH';

  constructor(private readonly analyticsHealthService: AnalyticsHealthService) {}

  async collect(context: IMonitoringSourceContext): Promise<IMonitoringSignal[]> {
    const checkedAt = new Date();

    if (context.workspaceId) {
      const summary = await this.analyticsHealthService.getWorkspaceHealth({ workspaceId: context.workspaceId } as any);
      return [{
        sourceKey: this.sourceKey,
        workspaceId: context.workspaceId,
        level: LEVEL_MAP[summary.overallStatus] ?? MonitoringHealthLevel.UNKNOWN,
        checkedAt,
        raw: { healthyServices: summary.healthyServices, degradedServices: summary.degradedServices, failedServices: summary.failedServices },
      }];
    }

    const system = await this.analyticsHealthService.getSystemHealth();
    return [{
      sourceKey: this.sourceKey,
      level: LEVEL_MAP[system.overallStatus] ?? MonitoringHealthLevel.UNKNOWN,
      checkedAt,
      raw: { totalWorkspaces: system.totalWorkspaces, degradedWorkspaces: system.degradedWorkspaces, failedWorkspaces: system.failedWorkspaces },
    }];
  }
}
