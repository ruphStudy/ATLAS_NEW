import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IGlobalSearchEventPayload } from '../interfaces';

@Injectable()
export class GlobalSearchEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.GLOBAL_SEARCH_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(payload: IGlobalSearchEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
