import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IJobEventPayload } from '../interfaces';

@Injectable()
export class AiJobEventQueue {
  constructor(
    @InjectQueue('ai-job-events')
    private readonly queue: Queue,
  ) {}

  async publish(payload: IJobEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
