import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { IAnalyticsEvent } from '../interfaces';

@Injectable()
export class AnalyticsFoundationEventQueue {
  private readonly logger = new Logger(AnalyticsFoundationEventQueue.name);

  constructor(
    @InjectQueue('analytics-foundation-events')
    private readonly queue: Queue,
  ) {}

  async publish(event: IAnalyticsEvent): Promise<void> {
    try {
      await this.queue.add('analytics-event', event, {
        removeOnComplete: true,
        removeOnFail: false,
      });

      this.logger.debug(
        `Published analytics event: ${event.event} for workspace ${event.workspaceId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish analytics event: ${(error as Error).message}`,
      );
    }
  }
}
