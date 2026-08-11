import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../../../common/constants';
import { IErrorEvent } from '../interfaces';

@Injectable()
export class ErrorEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.MARKETPLACE_ERROR_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(event: IErrorEvent): Promise<void> {
    await this.queue.add('error-event', event, {
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }

  async publishBatch(events: IErrorEvent[]): Promise<void> {
    const jobs = events.map((event) => ({
      name: 'error-event',
      data: event,
      opts: {
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    }));

    await this.queue.addBulk(jobs);
  }
}
