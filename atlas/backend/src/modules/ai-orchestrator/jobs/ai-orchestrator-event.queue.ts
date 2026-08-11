import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IOrchestratorEventPayload } from '../interfaces';

@Injectable()
export class AiOrchestratorEventQueue {
  constructor(
    @InjectQueue('ai-orchestrator-events')
    private readonly queue: Queue,
  ) {}

  async publish(payload: IOrchestratorEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
