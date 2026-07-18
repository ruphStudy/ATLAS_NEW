import { Queue, QueueOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { TrackingSyncJobPayload } from '../interfaces';
import { TRACKING_SYNC_QUEUE_CONFIG } from '../constants';

@Injectable()
export class TrackingSyncQueue implements OnModuleDestroy {
  private readonly logger = new Logger(TrackingSyncQueue.name);
  private queue: Queue<TrackingSyncJobPayload> | null = null;

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
          attempts: TRACKING_SYNC_QUEUE_CONFIG.ATTEMPTS,
          backoff: { type: 'exponential', delay: TRACKING_SYNC_QUEUE_CONFIG.BACKOFF_DELAY_MS },
          removeOnComplete: TRACKING_SYNC_QUEUE_CONFIG.REMOVE_ON_COMPLETE_COUNT,
          removeOnFail: TRACKING_SYNC_QUEUE_CONFIG.REMOVE_ON_FAIL_COUNT,
        },
      };
      this.queue = new Queue<TrackingSyncJobPayload>(QUEUE_NAMES.SHIPMENT_TRACKING_SYNC, opts);
      this.logger.log('Tracking Sync queue initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Tracking Sync queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.queue = null;
    }
  }

  async enqueue(payload: TrackingSyncJobPayload): Promise<void> {
    if (!this.queue) {
      this.logger.warn('Tracking Sync queue unavailable — sync skipped');
      return;
    }
    try {
      await this.queue.add('tracking-sync', payload, {
        jobId: `sync-${payload.shipmentId}-${Date.now()}`,
      });
      this.logger.log(`Queued tracking sync for ${payload.shipmentNumber} (${payload.carrier})`);
    } catch (error) {
      this.logger.error(
        `Failed to queue tracking sync: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      this.logger.log('Tracking Sync queue closed');
    }
  }
}
