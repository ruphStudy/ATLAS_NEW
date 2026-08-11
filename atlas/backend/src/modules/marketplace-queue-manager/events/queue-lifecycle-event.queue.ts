import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../../../common/constants';
import { IQueueLifecycleEvent } from '../interfaces';

@Injectable()
export class QueueLifecycleEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.MARKETPLACE_QUEUE_MANAGER_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(event: IQueueLifecycleEvent): Promise<void> {
    await this.queue.add('lifecycle-event', event, {
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }

  async publishBatch(events: IQueueLifecycleEvent[]): Promise<void> {
    const jobs = events.map((event) => ({
      name: 'lifecycle-event',
      data: event,
      opts: {
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    }));

    await this.queue.addBulk(jobs);
  }
}
