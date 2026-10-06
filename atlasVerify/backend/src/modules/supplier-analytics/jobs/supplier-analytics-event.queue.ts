import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ISupplierAnalyticsEvent } from '../interfaces';

@Injectable()
export class SupplierAnalyticsEventQueue {
  constructor(
    @InjectQueue('supplier-analytics-events')
    private readonly queue: Queue<ISupplierAnalyticsEvent>,
  ) {}

  async publish(event: ISupplierAnalyticsEvent): Promise<void> {
    await this.queue.add(event.event, event, {
      removeOnComplete: 100,
      removeOnFail: 1000,
    });
  }
}
