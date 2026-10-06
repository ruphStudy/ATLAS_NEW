import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../../../common/constants';
import { ConflictStrategy, OrderItemType, SyncDirection, SyncScope, SyncTrigger } from '../interfaces';

export interface OrderSyncJobPayload {
  jobId: string;
  correlationId: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  direction: SyncDirection;
  scope: SyncScope;
  itemType: OrderItemType;
  trigger: SyncTrigger;
  conflictStrategy: ConflictStrategy | null;
  filterOptions: Record<string, unknown> | null;
  scheduleId: string | null;
}

@Injectable()
export class OrderSyncQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.MARKETPLACE_ORDER_SYNC_JOBS)
    private readonly queue: Queue,
  ) {}

  async enqueueSync(payload: OrderSyncJobPayload): Promise<void> {
    await this.queue.add('order-sync', payload, {
      jobId: payload.correlationId,
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 200 },
    });
  }

  async removeJob(correlationId: string): Promise<void> {
    const job = await this.queue.getJob(correlationId);
    if (job) await job.remove();
  }
}
