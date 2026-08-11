import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../../../common/constants';
import { ConflictStrategy, ShipmentItemType, SyncDirection, SyncScope, SyncTrigger } from '../interfaces';

export interface ShipmentSyncJobPayload {
  jobId: string;
  correlationId: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  direction: SyncDirection;
  scope: SyncScope;
  itemType: ShipmentItemType;
  trigger: SyncTrigger;
  conflictStrategy: ConflictStrategy | null;
  filterOptions: Record<string, unknown> | null;
  scheduleId: string | null;
}

@Injectable()
export class ShipmentSyncQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.MARKETPLACE_SHIPMENT_SYNC_JOBS)
    private readonly queue: Queue,
  ) {}

  async enqueueSync(payload: ShipmentSyncJobPayload): Promise<void> {
    await this.queue.add('shipment-sync', payload, {
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
