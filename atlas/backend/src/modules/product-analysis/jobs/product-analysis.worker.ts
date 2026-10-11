import { Worker, Job } from 'bullmq';
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { ProductAnalysisService } from '../product-analysis.service';
import { AnalysisJobPayload } from '../interfaces';
import { ANALYSIS_QUEUE_CONFIG } from '../constants';

/**
 * Product Analysis Worker
 * Processes analysis jobs from the queue.
 */
@Injectable()
export class ProductAnalysisWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProductAnalysisWorker.name);
  private worker: Worker<AnalysisJobPayload> | null = null;

  constructor(
    private readonly configService: ConfigurationService,
    private readonly analysisService: ProductAnalysisService,
  ) {}

  onModuleInit(): void {
    this.initializeWorker();
  }

  private initializeWorker(): void {
    try {
      const redisConfig = this.configService.getRedisConfig();

      this.worker = new Worker<AnalysisJobPayload>(
        QUEUE_NAMES.PRODUCT_ANALYSIS,
        async (job: Job<AnalysisJobPayload>) => this.processAnalysisJob(job),
        {
          connection: {
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
            tls: redisConfig.tls ? {} : undefined,
            db: redisConfig.db,
          },
          concurrency: ANALYSIS_QUEUE_CONFIG.CONCURRENCY,
        },
      );

      this.worker.on('completed', (job) => {
        this.logger.log(`Job ${job.id} completed successfully`);
      });

      this.worker.on('failed', (job, err) => {
        this.logger.error(`Job ${job?.id} failed: ${err.message}`);
      });

      this.logger.log('Product Analysis worker initialized successfully');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.worker = null;
    }
  }

  private async processAnalysisJob(job: Job<AnalysisJobPayload>): Promise<void> {
    const { analysisId, opportunityId, workspaceId } = job.data;

    this.logger.log(
      `Processing analysis job: ${analysisId} for opportunity: ${opportunityId}`,
    );

    try {
      await this.analysisService.executeAnalysis(analysisId, workspaceId);
      this.logger.log(`Analysis completed: ${analysisId}`);
    } catch (error) {
      this.logger.error(
        `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.logger.log('Product Analysis worker closed');
    }
  }
}
