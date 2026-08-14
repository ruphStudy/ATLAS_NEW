import { Injectable } from '@nestjs/common';
import { DisasterRecoveryService } from '@modules/disaster-recovery/disaster-recovery.service';
import { DrExecutionStatus } from '@modules/disaster-recovery/interfaces';
import { IMonitoringSignal, IMonitoringSourceAdapter, IMonitoringSourceContext, MonitoringHealthLevel } from '../interfaces';

/** Wraps `DisasterRecoveryService.findExecutions` — a workspace with a recently FAILED recovery execution is surfaced as UNHEALTHY, never re-implementing recovery orchestration/health itself. */
@Injectable()
export class DisasterRecoverySourceAdapter implements IMonitoringSourceAdapter {
  readonly sourceKey = 'DISASTER_RECOVERY';

  constructor(private readonly disasterRecoveryService: DisasterRecoveryService) {}

  async collect(context: IMonitoringSourceContext): Promise<IMonitoringSignal[]> {
    if (!context.workspaceId) return [];
    const checkedAt = new Date();
    const failed = await this.disasterRecoveryService.findExecutions(context.workspaceId, {
      status: DrExecutionStatus.FAILED,
      page: 1,
      limit: 1,
    } as any);

    return [{
      sourceKey: this.sourceKey,
      workspaceId: context.workspaceId,
      level: failed.total > 0 ? MonitoringHealthLevel.UNHEALTHY : MonitoringHealthLevel.HEALTHY,
      checkedAt,
      raw: { recentFailedExecutions: failed.total },
    }];
  }
}
