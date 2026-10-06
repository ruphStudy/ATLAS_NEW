import { Queue, QueueOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { SeoEventPayload } from '../interfaces';
import { SEO_EVENT_QUEUE_CONFIG } from '../constants';

@Injectable()
export class SeoEventQueue implements OnModuleDestroy {
  private readonly logger = new Logger(SeoEventQueue.name);
  private queue: Queue<SeoEventPayload> | null = null;

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
          attempts: SEO_EVENT_QUEUE_CONFIG.ATTEMPTS,
          backoff: { type: 'exponential', delay: SEO_EVENT_QUEUE_CONFIG.BACKOFF_DELAY_MS },
          removeOnComplete: SEO_EVENT_QUEUE_CONFIG.REMOVE_ON_COMPLETE_COUNT,
          removeOnFail: SEO_EVENT_QUEUE_CONFIG.REMOVE_ON_FAIL_COUNT,
        },
      };
      this.queue = new Queue<SeoEventPayload>(QUEUE_NAMES.AI_SEO_EVENTS, opts);
      this.logger.log('SEO Event queue initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize SEO Event queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.queue = null;
    }
  }

  async enqueue(payload: SeoEventPayload): Promise<void> {
    if (!this.queue) {
      this.logger.warn('SEO Event queue unavailable — event skipped');
      return;
    }
    try {
      await this.queue.add('seo-event', payload, {
        jobId: `seo-${payload.seoId}-${payload.event}-${Date.now()}`,
      });
      this.logger.log(`Queued SEO event: ${payload.event} for ${payload.seoId}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue SEO event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
    }
  }
}
