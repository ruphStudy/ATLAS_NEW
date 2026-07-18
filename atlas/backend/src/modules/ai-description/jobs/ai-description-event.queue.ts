import { Queue, QueueOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { AiDescriptionJobPayload } from '../interfaces';
import { AI_DESCRIPTION_EVENT_QUEUE_CONFIG } from '../constants';

@Injectable()
export class AiDescriptionEventQueue implements OnModuleDestroy {
  private readonly logger = new Logger(AiDescriptionEventQueue.name);
  private queue: Queue<AiDescriptionJobPayload> | null = null;

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
          attempts: AI_DESCRIPTION_EVENT_QUEUE_CONFIG.ATTEMPTS,
          backoff: { type: 'exponential', delay: AI_DESCRIPTION_EVENT_QUEUE_CONFIG.BACKOFF_DELAY_MS },
          removeOnComplete: AI_DESCRIPTION_EVENT_QUEUE_CONFIG.REMOVE_ON_COMPLETE_COUNT,
          removeOnFail: AI_DESCRIPTION_EVENT_QUEUE_CONFIG.REMOVE_ON_FAIL_COUNT,
        },
      };
      this.queue = new Queue<AiDescriptionJobPayload>(QUEUE_NAMES.AI_DESCRIPTION_EVENTS, opts);
      this.logger.log('AI Description Event queue initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize AI Description Event queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.queue = null;
    }
  }

  async enqueue(payload: AiDescriptionJobPayload): Promise<void> {
    if (!this.queue) {
      this.logger.warn('AI Description Event queue unavailable — event skipped');
      return;
    }
    try {
      await this.queue.add('ai-description-event', payload, {
        jobId: `aid-${payload.descriptionId}-${payload.event}-${Date.now()}`,
      });
      this.logger.log(`Queued event: ${payload.event} for description ${payload.descriptionId}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue AI description event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
    }
  }
}
