import { Injectable } from '@nestjs/common';
import { SaasHealthService } from '@modules/saas-health/saas-health.service';
import { SaasHealthEvaluationTrigger, SaasHealthLevel } from '@modules/saas-health/interfaces';
import { IMonitoringSignal, IMonitoringSourceAdapter, IMonitoringSourceContext, MonitoringHealthLevel } from '../interfaces';

const LEVEL_MAP: Record<SaasHealthLevel, MonitoringHealthLevel> = {
  [SaasHealthLevel.HEALTHY]: MonitoringHealthLevel.HEALTHY,
  [SaasHealthLevel.DEGRADED]: MonitoringHealthLevel.DEGRADED,
  [SaasHealthLevel.UNHEALTHY]: MonitoringHealthLevel.UNHEALTHY,
  [SaasHealthLevel.OFFLINE]: MonitoringHealthLevel.OFFLINE,
  [SaasHealthLevel.MAINTENANCE]: MonitoringHealthLevel.MAINTENANCE,
};

/** Wraps `SaasHealthService` — reads its already-computed aggregate view, never re-gathers the underlying signals. */
@Injectable()
export class SaasHealthSourceAdapter implements IMonitoringSourceAdapter {
  readonly sourceKey = 'SAAS_HEALTH';

  constructor(private readonly saasHealthService: SaasHealthService) {}

  async collect(context: IMonitoringSourceContext): Promise<IMonitoringSignal[]> {
    const checkedAt = new Date();
    if (context.workspaceId) {
      const result = await this.saasHealthService.evaluateTenant(context.workspaceId, SaasHealthEvaluationTrigger.EVENT_DRIVEN);
      return [{
        sourceKey: this.sourceKey,
        workspaceId: context.workspaceId,
        level: LEVEL_MAP[result.level] ?? MonitoringHealthLevel.UNKNOWN,
        message: result.safeSummary,
        checkedAt,
        raw: { healthScore: result.healthScore },
      }];
    }

    const platform = await this.saasHealthService.getPlatformSummary();
    return [{
      sourceKey: this.sourceKey,
      level: LEVEL_MAP[platform.level] ?? MonitoringHealthLevel.UNKNOWN,
      checkedAt,
      raw: { averageHealthScore: platform.averageHealthScore, tenantsEvaluated: platform.tenantsEvaluated },
    }];
  }
}
