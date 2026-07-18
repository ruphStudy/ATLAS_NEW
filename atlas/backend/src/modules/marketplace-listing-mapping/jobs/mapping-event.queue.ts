import { Queue, QueueOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { MappingEventPayload } from '../interfaces';
import { MAPPING_EVENT_QUEUE_CONFIG } from '../constants';

@Injectable()
export class MappingEventQueue implements OnModuleDestroy {
  private readonly logger = new Logger(MappingEventQueue.name);
  private queue: Queue<MappingEventPayload> | null = null;

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
          attempts: MAPPING_EVENT_QUEUE_CONFIG.ATTEMPTS,
          backoff: { type: 'exponential', delay: MAPPING_EVENT_QUEUE_CONFIG.BACKOFF_DELAY_MS },
          removeOnComplete: MAPPING_EVENT_QUEUE_CONFIG.REMOVE_ON_COMPLETE_COUNT,
          removeOnFail: MAPPING_EVENT_QUEUE_CONFIG.REMOVE_ON_FAIL_COUNT,
        },
      };
      this.queue = new Queue<MappingEventPayload>(QUEUE_NAMES.MARKETPLACE_MAPPING_EVENTS, opts);
      this.logger.log('Marketplace Mapping Event queue initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Mapping Event queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.queue = null;
    }
  }

  async enqueue(payload: MappingEventPayload): Promise<void> {
    if (!this.queue) {
      this.logger.warn('Mapping Event queue unavailable — event skipped');
      return;
    }
    try {
      await this.queue.add('mapping-event', payload, {
        jobId: `mapping-event-${payload.entityId}-${payload.event}-${Date.now()}`,
      });
      this.logger.log(`Queued mapping event: ${payload.event} for entity ${payload.entityId}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue mapping event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) await this.queue.close();
  }
}
