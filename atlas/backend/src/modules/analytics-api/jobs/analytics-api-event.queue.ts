import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IAnalyticsApiEventPayload } from '../interfaces';

@Injectable()
export class AnalyticsApiEventQueue {
  private readonly logger = new Logger(AnalyticsApiEventQueue.name);

  constructor(
    @InjectQueue('analytics-api-events') private readonly queue: Queue,
  ) {}

  async publish(payload: IAnalyticsApiEventPayload): Promise<void> {
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
        endpoint: payload.endpoint,
      });
    } catch (error) {
      this.logger.error(
        `Failed to publish event ${payload.event}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
