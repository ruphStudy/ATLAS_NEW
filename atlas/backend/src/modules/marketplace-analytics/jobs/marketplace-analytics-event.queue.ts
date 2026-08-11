import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IMarketplaceAnalyticsEvent } from '../interfaces';

@Injectable()
export class MarketplaceAnalyticsEventQueue {
  constructor(
    @InjectQueue('marketplace-analytics-events')
    private readonly queue: Queue<IMarketplaceAnalyticsEvent>,
  ) {}

  async publish(event: IMarketplaceAnalyticsEvent): Promise<void> {
    await this.queue.add(event.event, event, {
      removeOnComplete: 100,
      removeOnFail: 1000,
    });
  }
}
