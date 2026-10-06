import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IProcurementAnalyticsEvent } from '../interfaces';

@Injectable()
export class ProcurementAnalyticsEventQueue {
  constructor(
    @InjectQueue('procurement-analytics-events')
    private readonly queue: Queue<IProcurementAnalyticsEvent>,
  ) {}

  async publish(event: IProcurementAnalyticsEvent): Promise<void> {
    await this.queue.add(event.event, event, {
      removeOnComplete: 100,
      removeOnFail: 1000,
    });
  }
}
