import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../../../common/constants';
import { SyncDirection, SyncMode, PriceItemType, ConflictResolutionStrategy } from '../interfaces';

export interface PriceSyncJobPayload {
  jobId: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  direction: SyncDirection;
  mode: SyncMode;
  itemType: PriceItemType;
  conflictStrategy: ConflictResolutionStrategy;
  cursor?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class PriceSyncQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.MARKETPLACE_PRICING_SYNC_JOBS)
    private readonly queue: Queue<PriceSyncJobPayload>,
  ) {}

  async enqueue(payload: PriceSyncJobPayload, delay?: number): Promise<void> {
    await this.queue.add('sync-price', payload, {
      jobId: payload.jobId,
      delay,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
  }

  async cancel(jobId: string): Promise<void> {
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove();
    }
  }

  async getJob(jobId: string) {
    return this.queue.getJob(jobId);
  }
}
