import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../../../common/constants';
import { PriceSyncEvent } from '../interfaces';

export interface PriceSyncEventPayload {
  event: PriceSyncEvent;
  workspaceId: string;
  accountId: string;
  jobId?: string;
  externalPriceId?: string;
  sku?: string;
  data?: Record<string, any>;
  timestamp: Date;
}

@Injectable()
export class PriceSyncEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.MARKETPLACE_PRICING_SYNC_EVENTS)
    private readonly queue: Queue<PriceSyncEventPayload>,
  ) {}

  async publish(payload: Omit<PriceSyncEventPayload, 'timestamp'>): Promise<void> {
    await this.queue.add(payload.event, {
      ...payload,
      timestamp: new Date(),
    });
  }

  async publishBatch(payloads: Array<Omit<PriceSyncEventPayload, 'timestamp'>>): Promise<void> {
    const jobs = payloads.map((payload) => ({
      name: payload.event,
      data: {
        ...payload,
        timestamp: new Date(),
      },
    }));
    await this.queue.addBulk(jobs);
  }
}
