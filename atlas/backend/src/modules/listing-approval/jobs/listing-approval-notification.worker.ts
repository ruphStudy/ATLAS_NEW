import { Worker, Job, WorkerOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { ApprovalNotificationJobPayload } from '../interfaces';

@Injectable()
export class ListingApprovalNotificationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ListingApprovalNotificationWorker.name);
  private worker: Worker<ApprovalNotificationJobPayload> | null = null;

  constructor(private readonly configService: ConfigurationService) {}

  onModuleInit(): void {
    this.initializeWorker();
  }

  private initializeWorker(): void {
    try {
      const redisConfig = this.configService.getRedisConfig();
      const opts: WorkerOptions = {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
          password: redisConfig.password,
          tls: redisConfig.tls ? {} : undefined,
          db: redisConfig.db,
        },
        concurrency: 5,
      };

      this.worker = new Worker<ApprovalNotificationJobPayload>(
        QUEUE_NAMES.LISTING_APPROVAL_NOTIFICATIONS,
        async (job: Job<ApprovalNotificationJobPayload>) => {
          await this.process(job.data);
        },
        opts,
      );

      this.worker.on('completed', (job) =>
        this.logger.log(`Approval notification processed: ${job.data.event}`),
      );
      this.worker.on('failed', (job, err) =>
        this.logger.error(`Approval notification failed: ${job?.data.event} – ${err.message}`),
      );
      this.logger.log('Listing Approval Notification worker initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Listing Approval Notification worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.worker = null;
    }
  }

  private async process(payload: ApprovalNotificationJobPayload): Promise<void> {
    this.logger.log(
      `Sending approval notification: ${payload.event} for listing ${payload.listingId} in workspace ${payload.workspaceId}`,
    );
    // Email / in-app notification dispatch goes here.
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }
}
