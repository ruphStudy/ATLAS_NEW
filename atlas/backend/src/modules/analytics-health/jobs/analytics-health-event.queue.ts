import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IAnalyticsHealthEventPayload } from '../interfaces';

@Injectable()
export class AnalyticsHealthEventQueue {
  private readonly logger = new Logger(AnalyticsHealthEventQueue.name);

  constructor(
    @InjectQueue('analytics-health-events') private readonly queue: Queue,
  ) {}

  async publish(payload: IAnalyticsHealthEventPayload): Promise<void> {
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
        service: payload.service,
      });
    } catch (error) {
      this.logger.error(
        `Failed to publish event ${payload.event}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
