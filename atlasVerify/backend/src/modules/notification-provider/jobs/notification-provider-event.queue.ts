import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { INotificationProviderPersistedEventPayload } from '../interfaces';

@Injectable()
export class NotificationProviderEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.NOTIFICATION_PROVIDER_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(payload: INotificationProviderPersistedEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
