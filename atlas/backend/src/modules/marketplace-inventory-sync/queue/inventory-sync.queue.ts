import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../../../common/constants';
import { ConfigurationService } from '@config/configuration.service';
import { ConflictStrategy, InventoryItemType, SyncDirection, SyncScope, SyncTrigger } from '../interfaces';
import { MP_INVENTORY_SYNC_QUEUE_CONFIG } from '../constants';

export interface InventorySyncJobPayload {
  jobId: string;
  correlationId: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  warehouseId?: string | null;
  direction: SyncDirection;
  scope: SyncScope;
  itemType: InventoryItemType;
  trigger: SyncTrigger;
  conflictStrategy?: ConflictStrategy;
  filterOptions?: Record<string, unknown> | null;
  scheduleId?: string | null;
  retryItemIds?: string[];
}

@Injectable()
export class InventorySyncQueue implements OnModuleDestroy {
  private readonly logger = new Logger(InventorySyncQueue.name);
  private readonly queue: Queue;

  constructor(configService: ConfigurationService) {
    const redis = configService.getRedisConfig();
    this.queue = new Queue(QUEUE_NAMES.MARKETPLACE_INVENTORY_SYNC_JOB, {
      connection: { host: redis.host, port: redis.port, password: redis.password, db: redis.db },
      defaultJobOptions: {
        attempts: MP_INVENTORY_SYNC_QUEUE_CONFIG.ATTEMPTS,
        backoff: { type: 'exponential', delay: MP_INVENTORY_SYNC_QUEUE_CONFIG.BACKOFF_MS },
        removeOnComplete: MP_INVENTORY_SYNC_QUEUE_CONFIG.REMOVE_ON_COMPLETE,
        removeOnFail: MP_INVENTORY_SYNC_QUEUE_CONFIG.REMOVE_ON_FAIL,
      },
    });
  }

  async enqueueSync(payload: InventorySyncJobPayload): Promise<void> {
    try {
      await this.queue.add('inventory-sync', payload, { jobId: payload.correlationId });
    } catch (err: any) {
      if (!err?.message?.includes('Job already exists')) {
        this.logger.warn(`Failed to enqueue inventory sync job: ${err?.message}`);
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
      this.logger.warn(`Failed to remove inventory sync queue job '${correlationId}'`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
