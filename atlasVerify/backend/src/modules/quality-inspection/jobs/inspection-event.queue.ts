import { Queue, QueueOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { InspectionJobPayload } from '../interfaces';
import { INSPECTION_QUEUE_CONFIG } from '../constants';

@Injectable()
export class InspectionEventQueue implements OnModuleDestroy {
  private readonly logger = new Logger(InspectionEventQueue.name);
  private queue: Queue<InspectionJobPayload> | null = null;

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
          attempts: INSPECTION_QUEUE_CONFIG.ATTEMPTS,
          backoff: { type: 'exponential', delay: INSPECTION_QUEUE_CONFIG.BACKOFF_DELAY_MS },
          removeOnComplete: INSPECTION_QUEUE_CONFIG.REMOVE_ON_COMPLETE_COUNT,
          removeOnFail: INSPECTION_QUEUE_CONFIG.REMOVE_ON_FAIL_COUNT,
        },
      };
      this.queue = new Queue<InspectionJobPayload>(QUEUE_NAMES.QUALITY_INSPECTION, opts);
      this.logger.log('Inspection Event queue initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Inspection Event queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.queue = null;
    }
  }

  async enqueue(payload: InspectionJobPayload): Promise<void> {
    if (!this.queue) {
      this.logger.warn('Inspection Event queue unavailable — event skipped');
      return;
    }
    try {
      await this.queue.add('inspection-event', payload, {
        jobId: `qi-${payload.inspectionId}-${payload.event}-${Date.now()}`,
      });
      this.logger.log(`Queued event: ${payload.event} for ${payload.inspectionNumber}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue inspection event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
    }
  }
}
