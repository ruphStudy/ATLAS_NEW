import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IAppStoreEventPayload } from '../interfaces';

@Injectable()
export class AppStoreEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.APP_STORE_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(payload: IAppStoreEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
