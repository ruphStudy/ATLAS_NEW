import { Queue, QueueOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { AiImageGenerationJobPayload } from '../interfaces';
import { AI_IMAGE_GENERATION_QUEUE_CONFIG } from '../constants';

@Injectable()
export class AiImageGenerationQueue implements OnModuleDestroy {
  private readonly logger = new Logger(AiImageGenerationQueue.name);
  private queue: Queue<AiImageGenerationJobPayload> | null = null;

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
          attempts: AI_IMAGE_GENERATION_QUEUE_CONFIG.ATTEMPTS,
          backoff: { type: 'exponential', delay: AI_IMAGE_GENERATION_QUEUE_CONFIG.BACKOFF_DELAY_MS },
          removeOnComplete: AI_IMAGE_GENERATION_QUEUE_CONFIG.REMOVE_ON_COMPLETE_COUNT,
          removeOnFail: AI_IMAGE_GENERATION_QUEUE_CONFIG.REMOVE_ON_FAIL_COUNT,
        },
      };
      this.queue = new Queue<AiImageGenerationJobPayload>(QUEUE_NAMES.AI_IMAGE_GENERATION, opts);
      this.logger.log('AI Image Generation queue initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize AI Image Generation queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.queue = null;
    }
  }

  async enqueue(payload: AiImageGenerationJobPayload): Promise<void> {
    if (!this.queue) {
      this.logger.warn('AI Image Generation queue unavailable — job skipped');
      return;
    }
    try {
      await this.queue.add('ai-image-generate', payload, {
        jobId: `img-gen-${payload.imageSetId}-${Date.now()}`,
      });
      this.logger.log(
        `Queued image generation for image set ${payload.imageSetId} (${payload.requests.length} images)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to enqueue AI image generation job: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
    }
  }
}
