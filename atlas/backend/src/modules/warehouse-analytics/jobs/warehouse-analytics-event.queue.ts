import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IWarehouseAnalyticsEvent } from '../interfaces';

@Injectable()
export class WarehouseAnalyticsEventQueue {
  constructor(
    @InjectQueue('warehouse-analytics-events')
    private readonly queue: Queue<IWarehouseAnalyticsEvent>,
  ) {}

  async publish(event: IWarehouseAnalyticsEvent): Promise<void> {
    await this.queue.add(event.event, event, {
      removeOnComplete: 100,
      removeOnFail: 1000,
    });
  }
}
