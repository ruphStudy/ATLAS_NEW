import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IAgentEventPayload } from '../interfaces';

@Injectable()
export class AiAgentEventQueue {
  constructor(
    @InjectQueue('ai-agent-events')
    private readonly queue: Queue,
  ) {}

  async publish(payload: IAgentEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
