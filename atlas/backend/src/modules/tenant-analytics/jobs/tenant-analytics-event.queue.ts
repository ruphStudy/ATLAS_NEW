import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { ITenantAnalyticsEventPayload } from '../interfaces';

@Injectable()
export class TenantAnalyticsEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.TENANT_ANALYTICS_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(payload: ITenantAnalyticsEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
