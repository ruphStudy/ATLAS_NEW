import { Queue, QueueOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { PublishJobPayload } from '../interfaces';
import { PUBLISH_QUEUE_CONFIG } from '../constants';

@Injectable()
export class PublishQueue implements OnModuleDestroy {
  private readonly logger = new Logger(PublishQueue.name);
  private queue: Queue<PublishJobPayload> | null = null;

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
          attempts: PUBLISH_QUEUE_CONFIG.ATTEMPTS,
          backoff: { type: 'exponential', delay: PUBLISH_QUEUE_CONFIG.BACKOFF_DELAY_MS },
          removeOnComplete: PUBLISH_QUEUE_CONFIG.REMOVE_ON_COMPLETE_COUNT,
          removeOnFail: PUBLISH_QUEUE_CONFIG.REMOVE_ON_FAIL_COUNT,
        },
      };
      this.queue = new Queue<PublishJobPayload>(QUEUE_NAMES.LISTING_PUBLISH, opts);
      this.logger.log('Publish queue initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Publish queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.queue = null;
    }
  }

  async enqueue(payload: PublishJobPayload, delay?: number): Promise<void> {
    if (!this.queue) {
      this.logger.warn('Publish queue unavailable — job skipped');
      return;
    }
    try {
      await this.queue.add('publish', payload, {
        jobId: `publish-${payload.publicationId}-${Date.now()}`,
        ...(delay && { delay }),
      });
      this.logger.log(
        `Queued publish job for ${payload.publicationId} (${payload.trigger})${delay ? ` delayed ${delay}ms` : ''}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to enqueue publish job: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
    }
  }
}
