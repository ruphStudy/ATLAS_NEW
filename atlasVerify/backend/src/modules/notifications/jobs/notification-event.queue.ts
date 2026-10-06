import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { INotificationEventPayload } from '../interfaces';

@Injectable()
export class NotificationEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.NOTIFICATION_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(payload: INotificationEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
