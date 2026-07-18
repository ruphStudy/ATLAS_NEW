import { Queue, QueueOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { BulkPublishJobPayload } from '../interfaces';
import { BULK_PUBLISH_QUEUE_CONFIG } from '../constants';

@Injectable()
export class BulkPublishQueue implements OnModuleDestroy {
  private readonly logger = new Logger(BulkPublishQueue.name);
  private queue: Queue<BulkPublishJobPayload> | null = null;

  constructor(private readonly configService: ConfigurationService) {
    this.initializeQueue();
  }

  private initializeQueue(): void {
    try {
      const redisConfig = this.configService.getRedisConfig();
      const opts: QueueOptions = {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
          password: redisConfig.password,
          db: redisConfig.db,
        },
        defaultJobOptions: {
          attempts: BULK_PUBLISH_QUEUE_CONFIG.ATTEMPTS,
          backoff: { type: 'exponential', delay: BULK_PUBLISH_QUEUE_CONFIG.BACKOFF_DELAY_MS },
          removeOnComplete: BULK_PUBLISH_QUEUE_CONFIG.REMOVE_ON_COMPLETE_COUNT,
          removeOnFail: BULK_PUBLISH_QUEUE_CONFIG.REMOVE_ON_FAIL_COUNT,
        },
      };
      this.queue = new Queue<BulkPublishJobPayload>(QUEUE_NAMES.LISTING_BULK_PUBLISH, opts);
      this.logger.log('Bulk Publish queue initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Bulk Publish queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.queue = null;
    }
  }

  async enqueue(payload: BulkPublishJobPayload): Promise<void> {
    if (!this.queue) {
      this.logger.warn('Bulk Publish queue unavailable — job skipped');
      return;
    }
    try {
      await this.queue.add('bulk-publish', payload, {
        jobId: `bulk-publish-${payload.workspaceId}-${Date.now()}`,
      });
      this.logger.log(
        `Queued bulk publish for workspace ${payload.workspaceId}: ${payload.items.length} listings`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to enqueue bulk publish job: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
    }
  }
}
