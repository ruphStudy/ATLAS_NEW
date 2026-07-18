import { Queue, QueueOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { ApprovalEventPayload } from '../interfaces';
import { LISTING_APPROVAL_EVENT_QUEUE_CONFIG } from '../constants';

@Injectable()
export class ListingApprovalEventQueue implements OnModuleDestroy {
  private readonly logger = new Logger(ListingApprovalEventQueue.name);
  private queue: Queue<ApprovalEventPayload> | null = null;

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
          attempts: LISTING_APPROVAL_EVENT_QUEUE_CONFIG.ATTEMPTS,
          backoff: { type: 'exponential', delay: LISTING_APPROVAL_EVENT_QUEUE_CONFIG.BACKOFF_DELAY_MS },
          removeOnComplete: LISTING_APPROVAL_EVENT_QUEUE_CONFIG.REMOVE_ON_COMPLETE_COUNT,
          removeOnFail: LISTING_APPROVAL_EVENT_QUEUE_CONFIG.REMOVE_ON_FAIL_COUNT,
        },
      };
      this.queue = new Queue<ApprovalEventPayload>(QUEUE_NAMES.LISTING_APPROVAL_EVENTS, opts);
      this.logger.log('Listing Approval Event queue initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Listing Approval Event queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.queue = null;
    }
  }

  async enqueue(payload: ApprovalEventPayload): Promise<void> {
    if (!this.queue) {
      this.logger.warn('Listing Approval Event queue unavailable — event skipped');
      return;
    }
    try {
      await this.queue.add('approval-event', payload, {
        jobId: `approval-${payload.approvalId}-${payload.event}-${Date.now()}`,
      });
      this.logger.log(`Queued approval event: ${payload.event} for ${payload.approvalId}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue approval event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
    }
  }
}
