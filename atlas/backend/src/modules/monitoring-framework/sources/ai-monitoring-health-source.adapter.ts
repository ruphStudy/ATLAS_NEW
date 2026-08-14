import { Injectable } from '@nestjs/common';
import { AiMonitoringHealthService } from '@modules/ai-monitoring-health/ai-monitoring-health.service';
import { IMonitoringSignal, IMonitoringSourceAdapter, IMonitoringSourceContext, MonitoringHealthLevel } from '../interfaces';

/** Wraps `AiMonitoringHealthService` — reads its already-computed workspace incident summary, never re-gathers the underlying AI provider/model health checks. */
@Injectable()
export class AiMonitoringHealthSourceAdapter implements IMonitoringSourceAdapter {
  readonly sourceKey = 'AI_MONITORING_HEALTH';

  constructor(private readonly aiMonitoringHealthService: AiMonitoringHealthService) {}

  async collect(context: IMonitoringSourceContext): Promise<IMonitoringSignal[]> {
    if (!context.workspaceId) return [];
    const checkedAt = new Date();
    const summary = await this.aiMonitoringHealthService.getWorkspaceHealthSummary(context.workspaceId);
    const activeIncidents = Number(summary?.activeIncidents ?? 0);

    return [{
      sourceKey: this.sourceKey,
      workspaceId: context.workspaceId,
      level: activeIncidents > 0 ? MonitoringHealthLevel.DEGRADED : MonitoringHealthLevel.HEALTHY,
      checkedAt,
      raw: { activeIncidents },
    }];
  }
}
