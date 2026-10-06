import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IAnalyticsAuditEventPayload } from '../interfaces';

@Injectable()
export class AnalyticsAuditEventQueue {
  private readonly logger = new Logger(AnalyticsAuditEventQueue.name);

  constructor(
    @InjectQueue('analytics-audit-events') private readonly queue: Queue,
  ) {}

  async publish(payload: IAnalyticsAuditEventPayload): Promise<void> {
    try {
      await this.queue.add(payload.event, payload, {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      this.logger.debug(`Published event: ${payload.event}`, {
        workspaceId: payload.workspaceId,
        auditRecordId: payload.auditRecordId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to publish event ${payload.event}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
