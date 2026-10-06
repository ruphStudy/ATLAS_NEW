import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IDecisionEventPayload } from '../interfaces';

@Injectable()
export class AiDecisionEventQueue {
  constructor(
    @InjectQueue('ai-decision-events')
    private readonly queue: Queue,
  ) {}

  async publish(payload: IDecisionEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
