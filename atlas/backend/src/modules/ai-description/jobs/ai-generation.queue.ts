import { Queue, QueueOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { AiGenerationJobPayload } from '../interfaces';
import { AI_GENERATION_QUEUE_CONFIG } from '../constants';

@Injectable()
export class AiGenerationQueue implements OnModuleDestroy {
  private readonly logger = new Logger(AiGenerationQueue.name);
  private queue: Queue<AiGenerationJobPayload> | null = null;

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
          attempts: AI_GENERATION_QUEUE_CONFIG.ATTEMPTS,
          backoff: { type: 'exponential', delay: AI_GENERATION_QUEUE_CONFIG.BACKOFF_DELAY_MS },
          removeOnComplete: AI_GENERATION_QUEUE_CONFIG.REMOVE_ON_COMPLETE_COUNT,
          removeOnFail: AI_GENERATION_QUEUE_CONFIG.REMOVE_ON_FAIL_COUNT,
        },
      };
      this.queue = new Queue<AiGenerationJobPayload>(QUEUE_NAMES.AI_DESCRIPTION_GENERATION, opts);
      this.logger.log('AI Generation queue initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize AI Generation queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.queue = null;
    }
  }

  async enqueue(payload: AiGenerationJobPayload): Promise<void> {
    if (!this.queue) {
      this.logger.warn('AI Generation queue unavailable — job skipped');
      return;
    }
    try {
      await this.queue.add('ai-generate', payload, {
        jobId: `gen-${payload.descriptionId}-${Date.now()}`,
      });
      this.logger.log(
        `Queued AI generation for description ${payload.descriptionId} (catalog: ${payload.catalogProductId})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to enqueue AI generation job: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
    }
  }
}
