import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IFinancialAnalyticsEvent } from '../interfaces';

@Injectable()
export class FinancialAnalyticsEventQueue {
  constructor(
    @InjectQueue('financial-analytics-events')
    private readonly queue: Queue<IFinancialAnalyticsEvent>,
  ) {}

  async publish(event: IFinancialAnalyticsEvent): Promise<void> {
    await this.queue.add(event.event, event, {
      removeOnComplete: 100,
      removeOnFail: 1000,
    });
  }
}
