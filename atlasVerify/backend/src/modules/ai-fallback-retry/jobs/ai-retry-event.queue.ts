import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IRetryEventPayload } from '../interfaces';

@Injectable()
export class AiRetryEventQueue {
  constructor(
    @InjectQueue('ai-retry-events')
    private readonly queue: Queue,
  ) {}

  async publish(payload: IRetryEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
