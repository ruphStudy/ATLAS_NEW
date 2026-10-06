import { Injectable } from '@nestjs/common';
import { SyncMonitorRepository } from '../repository/sync-monitor.repository';
import {
  SyncModule,
  SyncStatus,
  SyncIssueType,
  AlertSeverity,
  ISyncIssue,
  ISyncMonitorEvent,
  SyncMonitorEvent,
  SyncDetectionResult,
  ISyncSnapshot,
  IQueueHealth,
} from '../interfaces';

@Injectable()
export class SyncIssueDetector {
  private readonly STUCK_THRESHOLD_MINUTES = 60;
  private readonly DELAYED_THRESHOLD_MINUTES = 15;
  private readonly REPEATED_FAILURE_THRESHOLD = 3;
  private readonly HIGH_ERROR_RATE_THRESHOLD = 50;
  private readonly QUEUE_BACKUP_THRESHOLD = 500;

  constructor(private readonly repository: SyncMonitorRepository) {}

  async detectIssues(
    workspaceId: string,
    module?: SyncModule,
  ): Promise<SyncDetectionResult> {
    const issues: ISyncIssue[] = [];
    const alerts: ISyncMonitorEvent[] = [];

    const [stuckJobs, failingJobs] = await Promise.all([
      this.repository.findStuckJobs(
        workspaceId,
        this.STUCK_THRESHOLD_MINUTES,
      ),
      this.repository.findRepeatedlyFailingJobs(
        workspaceId,
        this.REPEATED_FAILURE_THRESHOLD,
      ),
    ]);

    for (const job of stuckJobs) {
      if (module && job.module !== module) continue;

      const issue = this.createStuckIssue(job);
      const alert = this.createAlert(issue, job.id as string);

      issues.push(issue);
      alerts.push(alert);
    }

    for (const job of failingJobs) {
      if (module && job.module !== module) continue;

      const issue = this.createRepeatedlyFailingIssue(job);
      const alert = this.createAlert(issue, job.id as string);

      issues.push(issue);
      alerts.push(alert);
    }

    return { issues, alerts };
  }

  async detectSnapshotIssues(
    snapshot: ISyncSnapshot,
    queueHealth?: IQueueHealth,
  ): Promise<SyncDetectionResult> {
    const issues: ISyncIssue[] = [];
    const alerts: ISyncMonitorEvent[] = [];

    if (this.isStuck(snapshot)) {
      const issue = this.createStuckIssueFromSnapshot(snapshot);
      const alert = this.createAlert(issue, snapshot.jobId);
      issues.push(issue);
      alerts.push(alert);
    }

    if (this.isDelayed(snapshot)) {
      const issue = this.createDelayedIssue(snapshot);
      const alert = this.createAlert(issue, snapshot.jobId);
      issues.push(issue);
      alerts.push(alert);
    }

    if (this.isPartiallyCompleted(snapshot)) {
      const issue = this.createPartiallyCompletedIssue(snapshot);
      const alert = this.createAlert(issue, snapshot.jobId);
      issues.push(issue);
      alerts.push(alert);
    }

    if (this.hasHighErrorRate(snapshot)) {
      const issue = this.createHighErrorRateIssue(snapshot);
      const alert = this.createAlert(issue, snapshot.jobId);
      issues.push(issue);
      alerts.push(alert);
    }

    if (this.isMissingSchedule(snapshot)) {
      const issue = this.createMissingScheduleIssue(snapshot);
      const alert = this.createAlert(issue, snapshot.jobId);
      issues.push(issue);
      alerts.push(alert);
    }

    if (queueHealth && this.isQueueBackedUp(queueHealth)) {
      const issue = this.createQueueBackedUpIssue(snapshot, queueHealth);
      const alert = this.createAlert(issue, snapshot.jobId);
      issues.push(issue);
      alerts.push(alert);
    }

    return { issues, alerts };
  }

  private isStuck(snapshot: ISyncSnapshot): boolean {
    if (snapshot.status !== SyncStatus.RUNNING) return false;
    if (!snapshot.startedAt) return false;

    const now = new Date();
    const duration = now.getTime() - snapshot.startedAt.getTime();
    const durationMinutes = duration / (1000 * 60);

    return durationMinutes > this.STUCK_THRESHOLD_MINUTES;
  }

  private isDelayed(snapshot: ISyncSnapshot): boolean {
    if (
      snapshot.status !== SyncStatus.QUEUED &&
      snapshot.status !== SyncStatus.SCHEDULED
    )
      return false;
    if (!snapshot.nextScheduledSyncAt) return false;

    const now = new Date();
    const scheduledTime = new Date(snapshot.nextScheduledSyncAt);
    const delayMinutes = (now.getTime() - scheduledTime.getTime()) / (1000 * 60);

    return delayMinutes > this.DELAYED_THRESHOLD_MINUTES;
  }

  private isPartiallyCompleted(snapshot: ISyncSnapshot): boolean {
    if (snapshot.status !== SyncStatus.COMPLETED) return false;
    return snapshot.itemsFailed > 0 && snapshot.successRate < 100;
  }

  private hasHighErrorRate(snapshot: ISyncSnapshot): boolean {
    return snapshot.successRate < this.HIGH_ERROR_RATE_THRESHOLD;
  }

  private isMissingSchedule(snapshot: ISyncSnapshot): boolean {
    return (
      snapshot.status === SyncStatus.IDLE && !snapshot.nextScheduledSyncAt
    );
  }

  private isQueueBackedUp(queueHealth: IQueueHealth): boolean {
    return queueHealth.waiting > this.QUEUE_BACKUP_THRESHOLD;
  }

  private createStuckIssue(job: any): ISyncIssue {
    return {
      workspaceId: job.workspaceId,
      module: job.module,
      provider: job.provider,
      accountId: job.accountId,
      type: SyncIssueType.STUCK,
      severity: AlertSeverity.ERROR,
      message: `Sync has been running for more than ${this.STUCK_THRESHOLD_MINUTES} minutes`,
      detectedAt: new Date(),
      metadata: {
        jobId: job.id,
        startedAt: job.startedAt,
        itemsProcessed: job.itemsProcessed,
      },
    };
  }

  private createStuckIssueFromSnapshot(snapshot: ISyncSnapshot): ISyncIssue {
    return {
      workspaceId: snapshot.workspaceId,
      module: snapshot.module,
      provider: snapshot.provider,
      accountId: snapshot.accountId,
      type: SyncIssueType.STUCK,
      severity: AlertSeverity.ERROR,
      message: `Sync has been running for more than ${this.STUCK_THRESHOLD_MINUTES} minutes`,
      detectedAt: new Date(),
      metadata: {
        jobId: snapshot.jobId,
        startedAt: snapshot.startedAt,
        itemsProcessed: snapshot.itemsProcessed,
        duration: snapshot.duration,
      },
    };
  }

  private createRepeatedlyFailingIssue(job: any): ISyncIssue {
    return {
      workspaceId: job.workspaceId,
      module: job.module,
      provider: job.provider,
      accountId: job.accountId,
      type: SyncIssueType.REPEATEDLY_FAILING,
      severity: AlertSeverity.CRITICAL,
      message: `Sync has failed ${job.consecutiveFailures} times consecutively`,
      detectedAt: new Date(),
      metadata: {
        jobId: job.id,
        consecutiveFailures: job.consecutiveFailures,
        lastError: job.lastError,
        lastErrorAt: job.lastErrorAt,
      },
    };
  }

  private createDelayedIssue(snapshot: ISyncSnapshot): ISyncIssue {
    return {
      workspaceId: snapshot.workspaceId,
      module: snapshot.module,
      provider: snapshot.provider,
      accountId: snapshot.accountId,
      type: SyncIssueType.DELAYED,
      severity: AlertSeverity.WARNING,
      message: `Sync is delayed by more than ${this.DELAYED_THRESHOLD_MINUTES} minutes`,
      detectedAt: new Date(),
      metadata: {
        jobId: snapshot.jobId,
        scheduledAt: snapshot.nextScheduledSyncAt,
      },
    };
  }

  private createPartiallyCompletedIssue(snapshot: ISyncSnapshot): ISyncIssue {
    return {
      workspaceId: snapshot.workspaceId,
      module: snapshot.module,
      provider: snapshot.provider,
      accountId: snapshot.accountId,
      type: SyncIssueType.PARTIALLY_COMPLETED,
      severity: AlertSeverity.WARNING,
      message: `Sync completed with ${snapshot.itemsFailed} failed items (${snapshot.successRate.toFixed(2)}% success rate)`,
      detectedAt: new Date(),
      metadata: {
        jobId: snapshot.jobId,
        itemsFailed: snapshot.itemsFailed,
        successRate: snapshot.successRate,
      },
    };
  }

  private createHighErrorRateIssue(snapshot: ISyncSnapshot): ISyncIssue {
    return {
      workspaceId: snapshot.workspaceId,
      module: snapshot.module,
      provider: snapshot.provider,
      accountId: snapshot.accountId,
      type: SyncIssueType.HIGH_ERROR_RATE,
      severity: AlertSeverity.ERROR,
      message: `Sync has high error rate: ${snapshot.successRate.toFixed(2)}%`,
      detectedAt: new Date(),
      metadata: {
        jobId: snapshot.jobId,
        successRate: snapshot.successRate,
        itemsFailed: snapshot.itemsFailed,
      },
    };
  }

  private createMissingScheduleIssue(snapshot: ISyncSnapshot): ISyncIssue {
    return {
      workspaceId: snapshot.workspaceId,
      module: snapshot.module,
      provider: snapshot.provider,
      accountId: snapshot.accountId,
      type: SyncIssueType.MISSING_SCHEDULE,
      severity: AlertSeverity.INFO,
      message: 'No scheduled sync configured',
      detectedAt: new Date(),
      metadata: {
        lastSuccessfulSyncAt: snapshot.lastSuccessfulSyncAt,
      },
    };
  }

  private createQueueBackedUpIssue(
    snapshot: ISyncSnapshot,
    queueHealth: IQueueHealth,
  ): ISyncIssue {
    return {
      workspaceId: snapshot.workspaceId,
      module: snapshot.module,
      provider: snapshot.provider,
      accountId: snapshot.accountId,
      type: SyncIssueType.QUEUE_BACKED_UP,
      severity: AlertSeverity.WARNING,
      message: `Queue has ${queueHealth.waiting} jobs waiting`,
      detectedAt: new Date(),
      metadata: {
        queueName: queueHealth.queueName,
        waiting: queueHealth.waiting,
        active: queueHealth.active,
      },
    };
  }

  private createAlert(
    issue: ISyncIssue,
    jobId?: string,
  ): ISyncMonitorEvent {
    return {
      eventType: SyncMonitorEvent.ALERT_TRIGGERED,
      workspaceId: issue.workspaceId,
      module: issue.module,
      provider: issue.provider,
      accountId: issue.accountId,
      jobId,
      issueType: issue.type,
      severity: issue.severity,
      message: issue.message,
      metadata: issue.metadata,
      timestamp: new Date(),
    };
  }
}
