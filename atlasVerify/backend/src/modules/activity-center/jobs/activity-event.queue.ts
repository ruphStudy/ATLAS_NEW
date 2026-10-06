import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IActivityEventPayload } from '../interfaces';

@Injectable()
export class ActivityEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.ACTIVITY_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(payload: IActivityEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
