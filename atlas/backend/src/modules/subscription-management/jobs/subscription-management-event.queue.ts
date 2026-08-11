import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { ISubscriptionManagementEventPayload } from '../interfaces';

@Injectable()
export class SubscriptionManagementEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.SUBSCRIPTION_MANAGEMENT_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(payload: ISubscriptionManagementEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
