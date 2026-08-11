import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IUsageTrackingEventPayload } from '../interfaces';

@Injectable()
export class UsageTrackingEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.USAGE_TRACKING_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(payload: IUsageTrackingEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
