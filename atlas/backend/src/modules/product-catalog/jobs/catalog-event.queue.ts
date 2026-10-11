import { Queue, QueueOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { CatalogJobPayload } from '../interfaces';
import { CATALOG_QUEUE_CONFIG } from '../constants';

@Injectable()
export class CatalogEventQueue implements OnModuleDestroy {
  private readonly logger = new Logger(CatalogEventQueue.name);
  private queue: Queue<CatalogJobPayload> | null = null;

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
          tls: redisConfig.tls ? {} : undefined,
          db: redisConfig.db,
        },
        defaultJobOptions: {
          attempts: CATALOG_QUEUE_CONFIG.ATTEMPTS,
          backoff: { type: 'exponential', delay: CATALOG_QUEUE_CONFIG.BACKOFF_DELAY_MS },
          removeOnComplete: CATALOG_QUEUE_CONFIG.REMOVE_ON_COMPLETE_COUNT,
          removeOnFail: CATALOG_QUEUE_CONFIG.REMOVE_ON_FAIL_COUNT,
        },
      };
      this.queue = new Queue<CatalogJobPayload>(QUEUE_NAMES.PRODUCT_CATALOG, opts);
      this.logger.log('Product Catalog Event queue initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Product Catalog Event queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.queue = null;
    }
  }

  async enqueue(payload: CatalogJobPayload): Promise<void> {
    if (!this.queue) {
      this.logger.warn('Product Catalog Event queue unavailable — event skipped');
      return;
    }
    try {
      await this.queue.add('catalog-event', payload, {
        jobId: `cat-${payload.catalogId}-${payload.event}-${Date.now()}`,
      });
      this.logger.log(`Queued catalog event: ${payload.event} for ${payload.catalogSku}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue catalog event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
    }
  }
}
