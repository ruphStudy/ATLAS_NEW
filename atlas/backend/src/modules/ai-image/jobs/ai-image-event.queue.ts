import { Queue, QueueOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { AiImageEventPayload } from '../interfaces';
import { AI_IMAGE_EVENT_QUEUE_CONFIG } from '../constants';

@Injectable()
export class AiImageEventQueue implements OnModuleDestroy {
  private readonly logger = new Logger(AiImageEventQueue.name);
  private queue: Queue<AiImageEventPayload> | null = null;

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
          attempts: AI_IMAGE_EVENT_QUEUE_CONFIG.ATTEMPTS,
          backoff: { type: 'exponential', delay: AI_IMAGE_EVENT_QUEUE_CONFIG.BACKOFF_DELAY_MS },
          removeOnComplete: AI_IMAGE_EVENT_QUEUE_CONFIG.REMOVE_ON_COMPLETE_COUNT,
          removeOnFail: AI_IMAGE_EVENT_QUEUE_CONFIG.REMOVE_ON_FAIL_COUNT,
        },
      };
      this.queue = new Queue<AiImageEventPayload>(QUEUE_NAMES.AI_IMAGE_EVENTS, opts);
      this.logger.log('AI Image Event queue initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize AI Image Event queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.queue = null;
    }
  }

  async enqueue(payload: AiImageEventPayload): Promise<void> {
    if (!this.queue) {
      this.logger.warn('AI Image Event queue unavailable — event skipped');
      return;
    }
    try {
      await this.queue.add('ai-image-event', payload, {
        jobId: `aie-${payload.imageSetId}-${payload.event}-${Date.now()}`,
      });
      this.logger.log(`Queued event: ${payload.event} for image set ${payload.imageSetId}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue AI image event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
    }
  }
}
