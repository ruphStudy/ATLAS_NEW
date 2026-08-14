import { Injectable } from '@nestjs/common';
import { BackupManagementService } from '@modules/backup-management/backup-management.service';
import { BackupJobStatus } from '@modules/backup-management/interfaces';
import { IMonitoringSignal, IMonitoringSourceAdapter, IMonitoringSourceContext, MonitoringHealthLevel } from '../interfaces';

/** Wraps `BackupManagementService.findJobs` — a workspace with a recently FAILED backup job is surfaced as UNHEALTHY, never re-implementing backup orchestration/health itself. */
@Injectable()
export class BackupManagementSourceAdapter implements IMonitoringSourceAdapter {
  readonly sourceKey = 'BACKUP_MANAGEMENT';

  constructor(private readonly backupManagementService: BackupManagementService) {}

  async collect(context: IMonitoringSourceContext): Promise<IMonitoringSignal[]> {
    if (!context.workspaceId) return [];
    const checkedAt = new Date();
    const failed = await this.backupManagementService.findJobs(context.workspaceId, {
      status: BackupJobStatus.FAILED,
      page: 1,
      limit: 1,
    } as any);

    return [{
      sourceKey: this.sourceKey,
      workspaceId: context.workspaceId,
      level: failed.total > 0 ? MonitoringHealthLevel.UNHEALTHY : MonitoringHealthLevel.HEALTHY,
      checkedAt,
      raw: { recentFailedJobs: failed.total },
    }];
  }
}
