import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { ConfigurationService } from '@config/configuration.service';
import { CatalogSyncEventPayload } from '../interfaces';
import { MP_CATALOG_SYNC_QUEUE_CONFIG } from '../constants';

// ── Sync Job Payload ──────────────────────────────────────────

export interface CatalogSyncJobPayload {
  jobId: string;
  correlationId: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  direction: string;
  scope: string;
  itemType: string;
  trigger: string;
  conflictStrategy: string;
  filterOptions?: Record<string, unknown> | null;
  scheduleId?: string | null;
  retryItemIds?: string[];
}

@Injectable()
export class CatalogSyncQueue {
  private readonly logger = new Logger(CatalogSyncQueue.name);
  readonly queue: Queue;

  constructor(configService: ConfigurationService) {
    const redis = configService.getRedisConfig();
    this.queue = new Queue(QUEUE_NAMES.MARKETPLACE_CATALOG_SYNC_JOB, {
      connection: { host: redis.host, port: redis.port, password: redis.password, db: redis.db, tls: redis.tls ? {} : undefined },
      defaultJobOptions: {
        attempts: MP_CATALOG_SYNC_QUEUE_CONFIG.ATTEMPTS,
        backoff: { type: 'exponential', delay: MP_CATALOG_SYNC_QUEUE_CONFIG.BACKOFF_MS },
        removeOnComplete: MP_CATALOG_SYNC_QUEUE_CONFIG.REMOVE_ON_COMPLETE,
        removeOnFail: MP_CATALOG_SYNC_QUEUE_CONFIG.REMOVE_ON_FAIL,
      },
    });
  }

  /**
   * Enqueues a sync job with idempotency guaranteed by correlationId as BullMQ jobId.
   * Duplicate enqueues with the same correlationId are safely ignored.
   */
  async enqueueSync(payload: CatalogSyncJobPayload): Promise<string> {
    try {
      const job = await this.queue.add('sync', payload, {
        jobId: payload.correlationId, // idempotency key
      });
      return job.id ?? payload.correlationId;
    } catch (err) {
      const msg = (err as Error).message;
      // BullMQ duplicate key error — idempotent, treat as success
      if (msg.includes('Job already exists') || msg.includes('duplicate')) {
        this.logger.debug(`Idempotent duplicate enqueue for correlation '${payload.correlationId}'`);
        return payload.correlationId;
      }
      this.logger.warn(`Failed to enqueue sync job '${payload.correlationId}': ${msg}`);
      throw err;
    }
  }

  async getJobState(correlationId: string): Promise<string | null> {
    try {
      const job = await this.queue.getJob(correlationId);
      if (!job) return null;
      return job.getState() as unknown as string;
    } catch {
      return null;
    }
  }

  async removeJob(correlationId: string): Promise<void> {
    try {
      const job = await this.queue.getJob(correlationId);
      if (job) await job.remove();
    } catch (err) {
      this.logger.warn(`Failed to remove queue job '${correlationId}': ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
