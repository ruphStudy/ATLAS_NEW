import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IPromptEventPayload } from '../interfaces';

@Injectable()
export class AiPromptEventQueue {
  constructor(
    @InjectQueue('ai-prompt-events')
    private readonly queue: Queue,
  ) {}

  async publish(payload: IPromptEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
