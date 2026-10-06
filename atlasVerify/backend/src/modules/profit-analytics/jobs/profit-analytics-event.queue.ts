import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IProfitAnalyticsEvent } from '../interfaces';

@Injectable()
export class ProfitAnalyticsEventQueue {
  constructor(
    @InjectQueue('profit-analytics-events')
    private readonly queue: Queue<IProfitAnalyticsEvent>,
  ) {}

  async publish(event: IProfitAnalyticsEvent): Promise<void> {
    await this.queue.add(event.event, event, {
      removeOnComplete: 100,
      removeOnFail: 1000,
    });
  }
}
