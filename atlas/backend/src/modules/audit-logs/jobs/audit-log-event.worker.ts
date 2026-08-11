import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IAuditEventPayload, AuditEvent } from '../interfaces';

@Processor(QUEUE_NAMES.AUDIT_LOG_EVENTS)
export class AuditLogEventWorker extends WorkerHost {
  private readonly logger = new Logger(AuditLogEventWorker.name);

  async process(job: Job<IAuditEventPayload>): Promise<void> {
    const { event, workspaceId } = job.data;

    switch (event) {
      case AuditEvent.AUDIT_RECORDED:
        this.logger.debug(`Audit recorded: ${job.data.auditLogId} for workspace ${workspaceId}`);
        break;
      case AuditEvent.SUSPICIOUS_ACTIVITY_DETECTED:
        this.logger.warn(
          `Suspicious activity detected: ${job.data.auditLogId} (actor ${job.data.actorId}, risk ${job.data.riskLevel}) for workspace ${workspaceId}`,
        );
        break;
      default:
        this.logger.warn(`Unknown event type: ${event}`);
    }
  }
}
