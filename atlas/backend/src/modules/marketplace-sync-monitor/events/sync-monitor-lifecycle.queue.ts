import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../../../common/constants';
import { ISyncMonitorEvent } from '../interfaces';

@Injectable()
export class SyncMonitorLifecycleQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.MARKETPLACE_SYNC_MONITOR_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(event: ISyncMonitorEvent): Promise<void> {
    await this.queue.add('lifecycle-event', event, {
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }

  async publishBatch(events: ISyncMonitorEvent[]): Promise<void> {
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
