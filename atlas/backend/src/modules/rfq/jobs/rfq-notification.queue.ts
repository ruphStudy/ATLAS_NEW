import { Queue, QueueOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { RfqNotificationJobPayload } from '../interfaces';
import { RFQ_QUEUE_CONFIG } from '../constants';

@Injectable()
export class RfqNotificationQueue implements OnModuleDestroy {
  private readonly logger = new Logger(RfqNotificationQueue.name);
  private queue: Queue<RfqNotificationJobPayload> | null = null;

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
          attempts: RFQ_QUEUE_CONFIG.ATTEMPTS,
          backoff: { type: 'exponential', delay: RFQ_QUEUE_CONFIG.BACKOFF_DELAY_MS },
          removeOnComplete: RFQ_QUEUE_CONFIG.REMOVE_ON_COMPLETE_COUNT,
          removeOnFail: RFQ_QUEUE_CONFIG.REMOVE_ON_FAIL_COUNT,
        },
      };

      this.queue = new Queue<RfqNotificationJobPayload>(QUEUE_NAMES.RFQ_NOTIFICATIONS, opts);
      this.logger.log('RFQ Notification queue initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize RFQ queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.queue = null;
    }
  }

  async enqueue(payload: RfqNotificationJobPayload): Promise<void> {
    if (!this.queue) {
      this.logger.warn('RFQ queue unavailable — notification skipped');
      return;
    }

    try {
      await this.queue.add('rfq-notification', payload, {
        jobId: `rfq-${payload.rfqId}-${payload.event}-${Date.now()}`,
      });
      this.logger.log(`Queued RFQ notification: ${payload.event} for ${payload.rfqId}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue RFQ notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      this.logger.log('RFQ Notification queue closed');
    }
  }
}
