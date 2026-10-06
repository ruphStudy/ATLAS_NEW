import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../../../common/constants';
import { ConfigurationService } from '@config/configuration.service';
import { ConflictStrategy, ListingItemType, SyncDirection, SyncScope, SyncTrigger } from '../interfaces';
import { MP_LISTING_SYNC_QUEUE_CONFIG } from '../constants';

export interface ListingSyncJobPayload {
  jobId: string;
  correlationId: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  direction: SyncDirection;
  scope: SyncScope;
  itemType: ListingItemType;
  trigger: SyncTrigger;
  conflictStrategy?: ConflictStrategy;
  filterOptions?: Record<string, unknown> | null;
  scheduleId?: string | null;
  retryItemIds?: string[];
}

@Injectable()
export class ListingSyncQueue implements OnModuleDestroy {
  private readonly logger = new Logger(ListingSyncQueue.name);
  private readonly queue: Queue;

  constructor(configService: ConfigurationService) {
    const redis = configService.getRedisConfig();
    this.queue = new Queue(QUEUE_NAMES.MARKETPLACE_LISTING_SYNC_JOB, {
      connection: { host: redis.host, port: redis.port, password: redis.password, db: redis.db },
      defaultJobOptions: {
        attempts: MP_LISTING_SYNC_QUEUE_CONFIG.ATTEMPTS,
        backoff: { type: 'exponential', delay: MP_LISTING_SYNC_QUEUE_CONFIG.BACKOFF_MS },
        removeOnComplete: MP_LISTING_SYNC_QUEUE_CONFIG.REMOVE_ON_COMPLETE,
        removeOnFail: MP_LISTING_SYNC_QUEUE_CONFIG.REMOVE_ON_FAIL,
      },
    });
  }

  async enqueueSync(payload: ListingSyncJobPayload): Promise<void> {
    try {
      await this.queue.add('listing-sync', payload, { jobId: payload.correlationId });
    } catch (err: any) {
      if (!err?.message?.includes('Job already exists')) {
        this.logger.warn(`Failed to enqueue listing sync job: ${err?.message}`);
      }
    }
  }

  async getJobState(correlationId: string): Promise<string | null> {
    try {
      const job = await this.queue.getJob(correlationId);
      return job ? await job.getState() : null;
    } catch {
      return null;
    }
  }

  async removeJob(correlationId: string): Promise<void> {
    try {
      const job = await this.queue.getJob(correlationId);
      if (job) await job.remove();
    } catch (err) {
      this.logger.warn(`Failed to remove listing sync queue job '${correlationId}'`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
