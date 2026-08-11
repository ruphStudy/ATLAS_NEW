import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ICustomerAnalyticsEvent } from '../interfaces';

@Injectable()
export class CustomerAnalyticsEventQueue {
  constructor(
    @InjectQueue('customer-analytics-events')
    private readonly queue: Queue<ICustomerAnalyticsEvent>,
  ) {}

  async publish(event: ICustomerAnalyticsEvent): Promise<void> {
    await this.queue.add(event.event, event, {
      removeOnComplete: 100,
      removeOnFail: 1000,
    });
  }
}
