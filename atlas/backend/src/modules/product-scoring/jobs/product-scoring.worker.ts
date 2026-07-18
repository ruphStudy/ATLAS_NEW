import { Worker, Job } from 'bullmq';
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { ProductScoringService } from '../product-scoring.service';
import { ProductScoringJobPayload } from '../interfaces';
import { SCORING_QUEUE_CONFIG } from '../constants';

@Injectable()
export class ProductScoringWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProductScoringWorker.name);
  private worker: Worker<ProductScoringJobPayload> | null = null;

  constructor(
    private readonly configService: ConfigurationService,
    private readonly scoringService: ProductScoringService,
  ) {}

  onModuleInit(): void {
    this.initializeWorker();
  }

  private initializeWorker(): void {
    try {
      const redisConfig = this.configService.getRedisConfig();

      this.worker = new Worker<ProductScoringJobPayload>(
        QUEUE_NAMES.PRODUCT_SCORING,
        async (job: Job<ProductScoringJobPayload>) => this.processJob(job),
        {
          connection: {
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
            db: redisConfig.db,
          },
          concurrency: SCORING_QUEUE_CONFIG.CONCURRENCY,
        },
      );

      this.worker.on('completed', (job) => {
        this.logger.log(`Job ${job.id} completed`);
      });

      this.worker.on('failed', (job, err) => {
        this.logger.error(`Job ${job?.id} failed: ${err.message}`);
      });

      this.logger.log('Product Scoring worker initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.worker = null;
    }
  }

  private async processJob(job: Job<ProductScoringJobPayload>): Promise<void> {
    const { scoringId, workspaceId } = job.data;
    this.logger.log(`Processing product scoring job: ${scoringId}`);

    try {
      await this.scoringService.executeScoring(scoringId, workspaceId);
    } catch (error) {
      this.logger.error(
        `Job failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.logger.log('Product Scoring worker closed');
    }
  }
}
