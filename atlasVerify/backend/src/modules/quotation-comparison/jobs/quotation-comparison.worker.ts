import { Worker, Job } from 'bullmq';
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { QuotationComparedJobPayload } from '../interfaces';
import { QUOTATION_COMPARISON_QUEUE_CONFIG } from '../constants';

@Injectable()
export class QuotationComparisonWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QuotationComparisonWorker.name);
  private worker: Worker<QuotationComparedJobPayload> | null = null;

  constructor(private readonly configService: ConfigurationService) {}

  onModuleInit(): void {
    this.initializeWorker();
  }

  private initializeWorker(): void {
    try {
      const redisConfig = this.configService.getRedisConfig();

      this.worker = new Worker<QuotationComparedJobPayload>(
        QUEUE_NAMES.QUOTATION_COMPARISON,
        async (job: Job<QuotationComparedJobPayload>) => this.processJob(job),
        {
          connection: {
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
            db: redisConfig.db,
          },
          concurrency: QUOTATION_COMPARISON_QUEUE_CONFIG.CONCURRENCY,
        },
      );

      this.worker.on('completed', (job) =>
        this.logger.log(`Quotation comparison job ${job.id} completed`),
      );
      this.worker.on('failed', (job, err) =>
        this.logger.error(`Quotation comparison job ${job?.id} failed: ${err.message}`),
      );

      this.logger.log('Quotation Comparison worker initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Quotation Comparison worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.worker = null;
    }
  }

  private async processJob(job: Job<QuotationComparedJobPayload>): Promise<void> {
    const { comparisonId, rfqId, workspaceId, event, selectedSupplierId } = job.data;

    this.logger.log(
      `Processing comparison event: event=${event} comparison=${comparisonId} rfq=${rfqId} workspace=${workspaceId}${selectedSupplierId ? ` selected=${selectedSupplierId}` : ''}`,
    );

    // TODO: Integrate with NotificationsService / email / webhooks when
    // notification infrastructure is fully implemented.
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.logger.log('Quotation Comparison worker closed');
    }
  }
}
