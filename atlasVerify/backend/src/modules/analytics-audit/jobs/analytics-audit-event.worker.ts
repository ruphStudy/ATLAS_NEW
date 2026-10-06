import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IAnalyticsAuditEventPayload, AnalyticsAuditEventType } from '../interfaces';

@Processor('analytics-audit-events')
export class AnalyticsAuditEventWorker extends WorkerHost {
  private readonly logger = new Logger(AnalyticsAuditEventWorker.name);

  async process(job: Job<IAnalyticsAuditEventPayload>): Promise<void> {
    const { event, workspaceId, auditRecordId, module, action, outcome, metadata } = job.data;

    this.logger.log(
      `Processing event: ${event} for workspace: ${workspaceId}, audit record: ${auditRecordId}`,
    );

    try {
      switch (event) {
        case AnalyticsAuditEventType.AUDIT_RECORDED:
          await this.handleAuditRecorded(job.data);
          break;
        case AnalyticsAuditEventType.SUSPICIOUS_ACTIVITY:
          await this.handleSuspiciousActivity(job.data);
          break;
        default:
          this.logger.warn(`Unknown event type: ${event}`);
      }
    } catch (error) {
      this.logger.error(
        `Error processing event ${event}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  private async handleAuditRecorded(payload: IAnalyticsAuditEventPayload): Promise<void> {
    this.logger.debug(
      `Audit recorded: ${payload.auditRecordId} (${payload.module}/${payload.action})`,
    );
  }

  private async handleSuspiciousActivity(payload: IAnalyticsAuditEventPayload): Promise<void> {
    this.logger.warn(
      `Suspicious activity detected in workspace: ${payload.workspaceId}`,
      payload.metadata,
    );
  }
}
