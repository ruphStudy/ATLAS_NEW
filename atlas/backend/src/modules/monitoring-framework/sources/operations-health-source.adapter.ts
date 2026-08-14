import { Injectable } from '@nestjs/common';
import { OperationsHealthService } from '@modules/operations-health/operations-health.service';
import { OperationsHealthStatus } from '@modules/operations-health/interfaces';
import { IMonitoringSignal, IMonitoringSourceAdapter, IMonitoringSourceContext, MonitoringHealthLevel } from '../interfaces';

const LEVEL_MAP: Record<OperationsHealthStatus, MonitoringHealthLevel> = {
  [OperationsHealthStatus.HEALTHY]: MonitoringHealthLevel.HEALTHY,
  [OperationsHealthStatus.DEGRADED]: MonitoringHealthLevel.DEGRADED,
  [OperationsHealthStatus.UNHEALTHY]: MonitoringHealthLevel.UNHEALTHY,
};

/** Wraps `OperationsHealthService` — reads its already-computed workspace summary (per Sprint-9 business-operation module queue health), never re-gathers the underlying signals. Platform-wide rollup is skipped: Operations Health has no self-discovering platform summary (its organization summary requires a caller-supplied workspace list). */
@Injectable()
export class OperationsHealthSourceAdapter implements IMonitoringSourceAdapter {
  readonly sourceKey = 'OPERATIONS_HEALTH';

  constructor(private readonly operationsHealthService: OperationsHealthService) {}

  async collect(context: IMonitoringSourceContext): Promise<IMonitoringSignal[]> {
    if (!context.workspaceId) return [];
    const checkedAt = new Date();
    const summary = await this.operationsHealthService.getWorkspaceSummary(context.workspaceId);

    return summary.modules.map((module) => ({
      sourceKey: this.sourceKey,
      workspaceId: context.workspaceId,
      service: module.module,
      level: LEVEL_MAP[module.status] ?? MonitoringHealthLevel.UNKNOWN,
      queueBacklog: module.queueBacklog,
      errorRate: module.queueFailedCount,
      message: module.safeSummary ?? undefined,
      checkedAt,
    }));
  }
}
