import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../../../../../common/constants';
import { AdapterOperation } from '../../../interfaces';

@Injectable()
export class ShopifyAdapterEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.MARKETPLACE_ADAPTER_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(event: {
    eventType: string;
    workspaceId: string;
    provider: string;
    accountId: string;
    operation: AdapterOperation;
    success: boolean;
    duration: number;
    metadata?: Record<string, any>;
    timestamp: Date;
  }): Promise<void> {
    await this.queue.add('adapter-event', event, {
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }

  async publishBatch(
    events: Array<{
      eventType: string;
      workspaceId: string;
      provider: string;
      accountId: string;
      operation: AdapterOperation;
      success: boolean;
      duration: number;
      metadata?: Record<string, any>;
      timestamp: Date;
    }>,
  ): Promise<void> {
    const jobs = events.map((event) => ({
      name: 'adapter-event',
      data: event,
      opts: {
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    }));

    await this.queue.addBulk(jobs);
  }
}
