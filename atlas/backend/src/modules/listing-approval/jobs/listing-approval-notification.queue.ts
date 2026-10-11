import { Queue, QueueOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { ApprovalNotificationJobPayload } from '../interfaces';
import { LISTING_APPROVAL_NOTIFICATION_QUEUE_CONFIG } from '../constants';

@Injectable()
export class ListingApprovalNotificationQueue implements OnModuleDestroy {
  private readonly logger = new Logger(ListingApprovalNotificationQueue.name);
  private queue: Queue<ApprovalNotificationJobPayload> | null = null;

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
          attempts: LISTING_APPROVAL_NOTIFICATION_QUEUE_CONFIG.ATTEMPTS,
          backoff: { type: 'exponential', delay: LISTING_APPROVAL_NOTIFICATION_QUEUE_CONFIG.BACKOFF_DELAY_MS },
          removeOnComplete: LISTING_APPROVAL_NOTIFICATION_QUEUE_CONFIG.REMOVE_ON_COMPLETE_COUNT,
          removeOnFail: LISTING_APPROVAL_NOTIFICATION_QUEUE_CONFIG.REMOVE_ON_FAIL_COUNT,
        },
      };
      this.queue = new Queue<ApprovalNotificationJobPayload>(
        QUEUE_NAMES.LISTING_APPROVAL_NOTIFICATIONS,
        opts,
      );
      this.logger.log('Listing Approval Notification queue initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Listing Approval Notification queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.queue = null;
    }
  }

  async enqueue(payload: ApprovalNotificationJobPayload): Promise<void> {
    if (!this.queue) {
      this.logger.warn('Listing Approval Notification queue unavailable — notification skipped');
      return;
    }
    try {
      await this.queue.add('approval-notification', payload, {
        jobId: `approval-notif-${payload.approvalId}-${payload.event}-${Date.now()}`,
      });
      this.logger.log(`Queued approval notification: ${payload.event} for ${payload.approvalId}`);
    } catch (error) {
      this.logger.error(
        `Failed to enqueue approval notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
    }
  }
}
