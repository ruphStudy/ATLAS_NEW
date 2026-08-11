import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../../../common/constants';
import { OrderSyncEvent } from '../interfaces';

export interface OrderSyncEventPayload {
  event: OrderSyncEvent;
  jobId: string;
  correlationId: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  direction: string;
  scope: string;
  itemType: string;
  status?: string;
  processedItems?: number;
  totalItems?: number;
  failedItems?: number;
  errorCode?: string;
  timestamp: Date;
}

@Injectable()
export class OrderSyncEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.MARKETPLACE_ORDER_SYNC_EVENTS)
    private readonly queue: Queue,
  ) {}

  async enqueue(payload: OrderSyncEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    });
  }
}
