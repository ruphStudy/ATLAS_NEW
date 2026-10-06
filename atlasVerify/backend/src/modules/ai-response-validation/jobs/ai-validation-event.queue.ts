import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IValidationEventPayload } from '../interfaces';

@Injectable()
export class AiValidationEventQueue {
  constructor(
    @InjectQueue('ai-validation-events')
    private readonly queue: Queue,
  ) {}

  async publish(payload: IValidationEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
