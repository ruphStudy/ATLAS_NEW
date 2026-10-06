import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IProductAnalyticsEvent } from '../interfaces';

@Injectable()
export class ProductAnalyticsEventQueue {
  constructor(
    @InjectQueue('product-analytics-events')
    private readonly queue: Queue<IProductAnalyticsEvent>,
  ) {}

  async publish(event: IProductAnalyticsEvent): Promise<void> {
    await this.queue.add(event.event, event, {
      removeOnComplete: 100,
      removeOnFail: 1000,
    });
  }
}
