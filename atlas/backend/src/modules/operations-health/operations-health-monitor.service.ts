import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityOutcome } from '@modules/audit-logs/interfaces';
import {
  IModuleHealthThresholds,
  IOperationsHealthIssue,
  OperationsHealthIssueTag,
  OperationsHealthModuleKey,
  OperationsHealthStatus,
} from './interfaces';
import {
  AUDIT_FAILURE_WINDOW_MINUTES,
  DELAYED_JOB_AGE_WARNING_MS,
  MONITORED_MODULE_AUDIT_MODULE_MAP,
  OPERATIONS_HEALTH_INTERNAL_ROLE,
  REPEATEDLY_FAILING_CONSECUTIVE_THRESHOLD,
} from './constants';
import { sanitizeSummary } from './sanitize.util';

export interface IRawHealthSignals {
  queueBacklog: number;
  queueFailedCount: number;
  queueActiveCount: number;
  queuePaused: boolean;
  oldestWaitingJobAgeMs: number | null;
  auditFailureCount: number;
}

export interface IComputedHealth {
  status: OperationsHealthStatus;
  issues: IOperationsHealthIssue[];
  safeSummary: string;
}

/**
 * OperationsHealthMonitorService — pure signal gathering + status
 * computation. Reads only already-generic infrastructure (BullMQ job
 * counts on each monitored module's own queue, and Audit Logs' existing
 * `findAll()` for a windowed failure count) — it never touches a monitored
 * module's own service/repository, so it cannot duplicate that module's
 * business logic.
 */
@Injectable()
export class OperationsHealthMonitorService {
  private readonly queuesByModule: Record<OperationsHealthModuleKey, Queue>;

  constructor(
    private readonly auditLogsService: AuditLogsService,
    @InjectQueue(QUEUE_NAMES.NOTIFICATION_EVENTS) notificationsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.FILE_EVENTS) fileQueue: Queue,
    @InjectQueue(QUEUE_NAMES.DOCUMENT_EVENTS) documentQueue: Queue,
    @InjectQueue(QUEUE_NAMES.APPROVAL_WORKFLOW_EVENTS) approvalWorkflowQueue: Queue,
    @InjectQueue(QUEUE_NAMES.TASK_MANAGEMENT_EVENTS) taskManagementQueue: Queue,
    @InjectQueue(QUEUE_NAMES.SEARCH_FRAMEWORK_EVENTS) searchFrameworkQueue: Queue,
    @InjectQueue(QUEUE_NAMES.BUSINESS_RULES_ENGINE_EVENTS) businessRulesEngineQueue: Queue,
    @InjectQueue(QUEUE_NAMES.SETTINGS_EVENTS) settingsQueue: Queue,
  ) {
    this.queuesByModule = {
      [OperationsHealthModuleKey.NOTIFICATIONS]: notificationsQueue,
      [OperationsHealthModuleKey.FILE_MANAGEMENT]: fileQueue,
      [OperationsHealthModuleKey.DOCUMENT_MANAGEMENT]: documentQueue,
      [OperationsHealthModuleKey.APPROVAL_WORKFLOW]: approvalWorkflowQueue,
      [OperationsHealthModuleKey.TASK_MANAGEMENT]: taskManagementQueue,
      [OperationsHealthModuleKey.SEARCH_FRAMEWORK]: searchFrameworkQueue,
      [OperationsHealthModuleKey.BUSINESS_RULES_ENGINE]: businessRulesEngineQueue,
      [OperationsHealthModuleKey.SETTINGS]: settingsQueue,
    };
  }

  async gatherSignals(workspaceId: string, module: OperationsHealthModuleKey): Promise<IRawHealthSignals> {
    const queue = this.queuesByModule[module];

    const [jobCounts, isPaused, waiting] = await Promise.all([queue.getJobCounts(), queue.isPaused(), queue.getWaiting(0, 0)]);

    const oldestWaiting = waiting[0];
    const oldestWaitingJobAgeMs = oldestWaiting ? Date.now() - oldestWaiting.timestamp : null;

    const since = new Date(Date.now() - AUDIT_FAILURE_WINDOW_MINUTES * 60_000);
    const auditModule = MONITORED_MODULE_AUDIT_MODULE_MAP[module];
    const auditFailures = await this.auditLogsService.findAll(workspaceId, OPERATIONS_HEALTH_INTERNAL_ROLE, {
      module: auditModule,
      outcome: ActivityOutcome.FAILURE,
      startDate: since.toISOString(),
      page: 1,
      limit: 1,
    });

    return {
      queueBacklog: (jobCounts.waiting ?? 0) + (jobCounts.delayed ?? 0),
      queueFailedCount: jobCounts.failed ?? 0,
      queueActiveCount: jobCounts.active ?? 0,
      queuePaused: isPaused,
      oldestWaitingJobAgeMs,
      auditFailureCount: auditFailures.total,
    };
  }

  computeHealth(
    module: OperationsHealthModuleKey,
    signals: IRawHealthSignals,
    thresholds: IModuleHealthThresholds,
    previousConsecutiveDegraded: number,
  ): IComputedHealth {
    const issues: IOperationsHealthIssue[] = [];

    if (signals.queuePaused) {
      issues.push({ tag: OperationsHealthIssueTag.QUEUE_PAUSED, message: `Queue for '${module}' is paused` });
    }

    const isCriticalBacklog = signals.queueBacklog >= thresholds.backlogCritical;
    const isWarningBacklog = signals.queueBacklog >= thresholds.backlogWarning;
    if (isWarningBacklog) {
      issues.push({
        tag: OperationsHealthIssueTag.QUEUE_BACKLOG,
        message: `Queue backlog is ${signals.queueBacklog} (warning >= ${thresholds.backlogWarning}, critical >= ${thresholds.backlogCritical})`,
      });
    }

    const isCriticalFailures =
      signals.queueFailedCount >= thresholds.failedCritical || signals.auditFailureCount >= thresholds.auditFailureCritical;
    const isWarningFailures =
      signals.queueFailedCount >= thresholds.failedWarning || signals.auditFailureCount >= thresholds.auditFailureWarning;
    if (isWarningFailures) {
      issues.push({
        tag: OperationsHealthIssueTag.HIGH_FAILURE_RATE,
        message: `${signals.queueFailedCount} failed queue job(s) and ${signals.auditFailureCount} audit failure(s) in the last ${AUDIT_FAILURE_WINDOW_MINUTES}m`,
      });
    }

    if (signals.oldestWaitingJobAgeMs !== null && signals.oldestWaitingJobAgeMs >= DELAYED_JOB_AGE_WARNING_MS) {
      issues.push({
        tag: OperationsHealthIssueTag.DELAYED,
        message: `Oldest waiting job has been queued for ${Math.round(signals.oldestWaitingJobAgeMs / 1000)}s`,
      });
    }

    if (signals.queueActiveCount === 0 && isWarningBacklog) {
      issues.push({ tag: OperationsHealthIssueTag.STUCK, message: 'Queue has a backlog but no active workers processing it' });
    }

    let status: OperationsHealthStatus;
    if (signals.queuePaused || isCriticalBacklog || isCriticalFailures) {
      status = OperationsHealthStatus.UNHEALTHY;
    } else if (isWarningBacklog || isWarningFailures || issues.length > 0) {
      status = OperationsHealthStatus.DEGRADED;
    } else {
      status = OperationsHealthStatus.HEALTHY;
    }

    if (status !== OperationsHealthStatus.HEALTHY && previousConsecutiveDegraded + 1 >= REPEATEDLY_FAILING_CONSECUTIVE_THRESHOLD) {
      issues.push({
        tag: OperationsHealthIssueTag.REPEATEDLY_FAILING,
        message: `Module has been unhealthy/degraded for ${previousConsecutiveDegraded + 1} consecutive checks`,
      });
    }

    const summary =
      issues.length === 0
        ? `'${module}' is healthy: backlog ${signals.queueBacklog}, failed ${signals.queueFailedCount}, audit failures ${signals.auditFailureCount}`
        : `'${module}' is ${status.toLowerCase()}: ${issues.map((i) => i.message).join('; ')}`;

    return { status, issues, safeSummary: sanitizeSummary(summary) };
  }
}
