import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { WarehouseAuditEventPayload } from './warehouse-audit-event.queue';

@Processor('warehouse-audit-events')
export class WarehouseAuditEventWorker extends WorkerHost {
  private readonly logger = new Logger(WarehouseAuditEventWorker.name);

  async process(job: Job<WarehouseAuditEventPayload>): Promise<void> {
    this.logger.log(`Processing warehouse audit event: ${job.name}`);

    const { event, workspaceId } = job.data;

    try {
      switch (event) {
        case 'warehouse-audit.recorded':
          await this.handleAuditRecorded(job.data);
          break;
        case 'warehouse-audit.suspicious_activity':
          await this.handleSuspiciousActivity(job.data);
          break;
        default:
          this.logger.warn(`Unknown audit event type: ${event}`);
      }
    } catch (error) {
      this.logger.error(
        `Error processing audit event ${event} for workspace ${workspaceId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private async handleAuditRecorded(
    payload: WarehouseAuditEventPayload,
  ): Promise<void> {
    this.logger.log(
      `Audit log ${payload.auditLogId} recorded for workspace ${payload.workspaceId}`,
    );
  }

  private async handleSuspiciousActivity(
    payload: WarehouseAuditEventPayload,
  ): Promise<void> {
    this.logger.warn(
      `Suspicious activity detected: ${payload.actionType} on ${payload.entityType} ${payload.entityId}`,
    );
  }
}
