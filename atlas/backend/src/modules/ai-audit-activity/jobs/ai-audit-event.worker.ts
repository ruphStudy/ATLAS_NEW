import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AiAuditEvent, AiAuditEventType } from '../interfaces';

@Processor('ai-audit-events')
export class AiAuditEventWorker extends WorkerHost {
  private readonly logger = new Logger(AiAuditEventWorker.name);

  async process(job: Job<AiAuditEvent>): Promise<void> {
    const { event } = job.data;

    this.logger.debug(`Processing ${event} event`, {
      jobId: job.id,
      workspaceId: job.data.workspaceId,
    });

    try {
      switch (event) {
        case AiAuditEventType.ACTIVITY_RECORDED:
          await this.handleActivityRecorded(job.data);
          break;
        case AiAuditEventType.SUSPICIOUS_ACTIVITY:
          await this.handleSuspiciousActivity(job.data);
          break;
        default:
          this.logger.warn(`Unknown event type: ${event}`);
      }

      this.logger.debug(`Successfully processed ${event} event`);
    } catch (error) {
      this.logger.error(`Failed to process ${event} event`, error);
      throw error;
    }
  }

  private async handleActivityRecorded(event: AiAuditEvent): Promise<void> {
    this.logger.debug('Activity recorded event processed', {
      workspaceId: event.workspaceId,
    });
  }

  private async handleSuspiciousActivity(event: AiAuditEvent): Promise<void> {
    this.logger.warn('Suspicious activity detected', {
      workspaceId: event.workspaceId,
    });
  }
}
