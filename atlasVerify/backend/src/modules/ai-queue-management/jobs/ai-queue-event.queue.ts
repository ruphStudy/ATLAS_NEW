import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IQueueEventPayload } from '../interfaces';

@Injectable()
export class AiQueueEventQueue {
  constructor(
    @InjectQueue('ai-queue-events')
    private readonly queue: Queue,
  ) {}

  async publish(payload: IQueueEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
