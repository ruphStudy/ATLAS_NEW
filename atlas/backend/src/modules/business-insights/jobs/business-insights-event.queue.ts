import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IInsightEventPayload } from '../interfaces';

@Injectable()
export class BusinessInsightsEventQueue {
  private readonly logger = new Logger(BusinessInsightsEventQueue.name);

  constructor(
    @InjectQueue('business-insights-events') private readonly queue: Queue,
  ) {}

  async publish(payload: IInsightEventPayload): Promise<void> {
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
        insightId: payload.insightId,
        insightKey: payload.insightKey,
      });
    } catch (error) {
      this.logger.error(
        `Failed to publish event ${payload.event}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
