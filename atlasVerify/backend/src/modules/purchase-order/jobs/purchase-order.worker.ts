import { Worker, Job } from 'bullmq';
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { PurchaseOrderJobPayload } from '../interfaces';
import { PO_QUEUE_CONFIG } from '../constants';

@Injectable()
export class PurchaseOrderWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PurchaseOrderWorker.name);
  private worker: Worker<PurchaseOrderJobPayload> | null = null;

  constructor(private readonly configService: ConfigurationService) {}

  onModuleInit(): void {
    this.initializeWorker();
  }

  private initializeWorker(): void {
    try {
      const redisConfig = this.configService.getRedisConfig();
      this.worker = new Worker<PurchaseOrderJobPayload>(
        QUEUE_NAMES.PURCHASE_ORDER,
        async (job: Job<PurchaseOrderJobPayload>) => this.processJob(job),
        {
          connection: {
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
            db: redisConfig.db,
          },
          concurrency: PO_QUEUE_CONFIG.CONCURRENCY,
        },
      );
      this.worker.on('completed', (job) =>
        this.logger.log(`Purchase Order job ${job.id} completed`),
      );
      this.worker.on('failed', (job, err) =>
        this.logger.error(`Purchase Order job ${job?.id} failed: ${err.message}`),
      );
      this.logger.log('Purchase Order worker initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Purchase Order worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.worker = null;
    }
  }

  private async processJob(job: Job<PurchaseOrderJobPayload>): Promise<void> {
    const { purchaseOrderId, poNumber, workspaceId, event, changedBy } = job.data;
    this.logger.log(
      `Processing PO event: event=${event} po=${poNumber} workspace=${workspaceId}${changedBy ? ` by=${changedBy}` : ''}`,
    );
    // TODO: Integrate with NotificationsService when infrastructure is ready.
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.logger.log('Purchase Order worker closed');
    }
  }
}
