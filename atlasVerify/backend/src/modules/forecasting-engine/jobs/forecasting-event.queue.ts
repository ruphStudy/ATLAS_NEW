import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IForecastEventPayload } from '../interfaces';

@Injectable()
export class ForecastingEventQueue {
  private readonly logger = new Logger(ForecastingEventQueue.name);

  constructor(
    @InjectQueue('forecasting-events') private readonly queue: Queue,
  ) {}

  async publish(payload: IForecastEventPayload): Promise<void> {
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
        definitionId: payload.definitionId,
        executionId: payload.executionId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to publish event ${payload.event}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
