import { Worker, Job } from 'bullmq';
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { RfqNotificationJobPayload } from '../interfaces';
import { RFQ_QUEUE_CONFIG } from '../constants';

@Injectable()
export class RfqNotificationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RfqNotificationWorker.name);
  private worker: Worker<RfqNotificationJobPayload> | null = null;

  constructor(private readonly configService: ConfigurationService) {}

  onModuleInit(): void {
    this.initializeWorker();
  }

  private initializeWorker(): void {
    try {
      const redisConfig = this.configService.getRedisConfig();

      this.worker = new Worker<RfqNotificationJobPayload>(
        QUEUE_NAMES.RFQ_NOTIFICATIONS,
        async (job: Job<RfqNotificationJobPayload>) => this.processJob(job),
        {
          connection: {
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
            tls: redisConfig.tls ? {} : undefined,
            db: redisConfig.db,
          },
          concurrency: RFQ_QUEUE_CONFIG.CONCURRENCY,
        },
      );

      this.worker.on('completed', (job) => this.logger.log(`RFQ notification job ${job.id} completed`));
      this.worker.on('failed', (job, err) =>
        this.logger.error(`RFQ notification job ${job?.id} failed: ${err.message}`),
      );

      this.logger.log('RFQ Notification worker initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize RFQ worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.worker = null;
    }
  }

  private async processJob(job: Job<RfqNotificationJobPayload>): Promise<void> {
    const { rfqId, rfqNumber, workspaceId, event, supplierId } = job.data;

    this.logger.log(
      `Processing RFQ notification: event=${event} rfq=${rfqNumber} workspace=${workspaceId}${supplierId ? ` supplier=${supplierId}` : ''}`,
    );

    // TODO: Integrate with NotificationsService / email / webhook when
    // notification infrastructure is fully implemented.
    // The job data carries all required fields to dispatch downstream notifications.
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.logger.log('RFQ Notification worker closed');
    }
  }
}
