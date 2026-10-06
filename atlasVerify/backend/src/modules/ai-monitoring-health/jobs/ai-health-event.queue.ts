import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AiHealthEvent } from '../interfaces';

@Injectable()
export class AiHealthEventQueue {
  private readonly logger = new Logger(AiHealthEventQueue.name);

  constructor(
    @InjectQueue('ai-health-events')
    private readonly queue: Queue,
  ) {}

  async publish(event: AiHealthEvent): Promise<void> {
    try {
      await this.queue.add(event.event, event, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      });

      this.logger.debug(`Published ${event.event} event to queue`);
    } catch (error) {
      this.logger.error(`Failed to publish ${event.event} event`, error);
      throw error;
    }
  }
}
