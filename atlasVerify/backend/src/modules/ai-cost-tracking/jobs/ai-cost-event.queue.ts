import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IAiCostEventPayload } from '../interfaces';

@Injectable()
export class AiCostEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.AI_COST_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(payload: IAiCostEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
