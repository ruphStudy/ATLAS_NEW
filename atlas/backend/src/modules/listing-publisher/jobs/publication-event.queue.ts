import { Queue, QueueOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { PublicationEventPayload } from '../interfaces';
import { PUBLICATION_EVENT_QUEUE_CONFIG } from '../constants';

@Injectable()
export class PublicationEventQueue implements OnModuleDestroy {
  private readonly logger = new Logger(PublicationEventQueue.name);
  private queue: Queue<PublicationEventPayload> | null = null;

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
          attempts: PUBLICATION_EVENT_QUEUE_CONFIG.ATTEMPTS,
          backoff: { type: 'exponential', delay: PUBLICATION_EVENT_QUEUE_CONFIG.BACKOFF_DELAY_MS },
          removeOnComplete: PUBLICATION_EVENT_QUEUE_CONFIG.REMOVE_ON_COMPLETE_COUNT,
          removeOnFail: PUBLICATION_EVENT_QUEUE_CONFIG.REMOVE_ON_FAIL_COUNT,
        },
      };
      this.queue = new Queue<PublicationEventPayload>(QUEUE_NAMES.PUBLICATION_EVENTS, opts);
      this.logger.log('Publication Event queue initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Publication Event queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.queue = null;
    }
  }

  async enqueue(payload: PublicationEventPayload): Promise<void> {
    if (!this.queue) {
      this.logger.warn('Publication Event queue unavailable — event skipped');
      return;
    }
    try {
      await this.queue.add('publication-event', payload, {
        jobId: `pub-event-${payload.publicationId}-${payload.event}-${Date.now()}`,
      });
      this.logger.log(`Queued publication event: ${payload.event} for ${payload.publicationId}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue publication event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
    }
  }
}
