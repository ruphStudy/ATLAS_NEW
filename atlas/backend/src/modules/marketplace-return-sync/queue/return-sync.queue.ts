import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../../../common/constants';
import { ConflictStrategy, ReturnItemType, SyncDirection, SyncScope, SyncTrigger } from '../interfaces';

export interface ReturnSyncJobPayload {
  jobId: string;
  correlationId: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  direction: SyncDirection;
  scope: SyncScope;
  itemType: ReturnItemType;
  trigger: SyncTrigger;
  conflictStrategy: ConflictStrategy | null;
  filterOptions: Record<string, unknown> | null;
  scheduleId: string | null;
}

@Injectable()
export class ReturnSyncQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.MARKETPLACE_RETURN_SYNC_JOBS)
    private readonly queue: Queue,
  ) {}

  async enqueueSync(payload: ReturnSyncJobPayload): Promise<void> {
    await this.queue.add('return-sync', payload, {
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
