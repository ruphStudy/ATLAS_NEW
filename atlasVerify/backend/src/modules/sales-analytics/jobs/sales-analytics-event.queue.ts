import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { ISalesAnalyticsEvent } from '../interfaces';

@Injectable()
export class SalesAnalyticsEventQueue {
  private readonly logger = new Logger(SalesAnalyticsEventQueue.name);

  constructor(
    @InjectQueue('sales-analytics-events') private readonly queue: Queue,
  ) {}

  async publish(event: ISalesAnalyticsEvent): Promise<void> {
    try {
      await this.queue.add('sales-analytics-event', event, {
        removeOnComplete: true,
        removeOnFail: false,
      });

      this.logger.debug(
        `Published event: ${event.event} for workspace ${event.workspaceId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish event: ${event.event}`,
        (error as Error).stack,
      );
    }
  }
}
