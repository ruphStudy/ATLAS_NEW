import { Worker, Job } from 'bullmq';
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { ProductCostJobPayload } from '../interfaces';
import { PRODUCT_COST_QUEUE_CONFIG } from '../constants';

@Injectable()
export class ProductCostWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProductCostWorker.name);
  private worker: Worker<ProductCostJobPayload> | null = null;

  constructor(private readonly configService: ConfigurationService) {}

  onModuleInit(): void {
    this.initializeWorker();
  }

  private initializeWorker(): void {
    try {
      const redisConfig = this.configService.getRedisConfig();
      this.worker = new Worker<ProductCostJobPayload>(
        QUEUE_NAMES.PRODUCT_COST,
        async (job: Job<ProductCostJobPayload>) => this.processJob(job),
        {
          connection: {
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
            tls: redisConfig.tls ? {} : undefined,
            db: redisConfig.db,
          },
          concurrency: PRODUCT_COST_QUEUE_CONFIG.CONCURRENCY,
        },
      );
      this.worker.on('completed', (job) =>
        this.logger.log(`Product Cost job ${job.id} completed`),
      );
      this.worker.on('failed', (job, err) =>
        this.logger.error(`Product Cost job ${job?.id} failed: ${err.message}`),
      );
      this.logger.log('Product Cost worker initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Product Cost worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.worker = null;
    }
  }

  private async processJob(job: Job<ProductCostJobPayload>): Promise<void> {
    const { calculationId, workspaceId, event, productId } = job.data;
    this.logger.log(
      `Processing product cost event: event=${event} calculation=${calculationId} workspace=${workspaceId}${productId ? ` product=${productId}` : ''}`,
    );
    // TODO: Integrate with NotificationsService when infrastructure is ready.
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.logger.log('Product Cost worker closed');
    }
  }
}
