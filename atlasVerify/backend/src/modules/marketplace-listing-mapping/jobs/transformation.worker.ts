import { Worker, Job, WorkerOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { TransformationJobPayload } from '../interfaces';
import { MarketplaceListingMappingService } from '../marketplace-listing-mapping.service';
import { TRANSFORMATION_QUEUE_CONFIG } from '../constants';

@Injectable()
export class TransformationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TransformationWorker.name);
  private worker: Worker<TransformationJobPayload> | null = null;

  constructor(
    private readonly configService: ConfigurationService,
    private readonly service: MarketplaceListingMappingService,
  ) {}

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
          db: redisConfig.db,
        },
        concurrency: TRANSFORMATION_QUEUE_CONFIG.CONCURRENCY,
      };

      this.worker = new Worker<TransformationJobPayload>(
        QUEUE_NAMES.MARKETPLACE_TRANSFORMATION,
        async (job: Job<TransformationJobPayload>) => {
          await this.process(job.data);
        },
        opts,
      );

      this.worker.on('completed', (job) =>
        this.logger.log(`Transformation completed: job ${job.data.jobId}`),
      );
      this.worker.on('failed', (job, err) =>
        this.logger.error(`Transformation failed: job ${job?.data.jobId} – ${err.message}`),
      );
      this.logger.log('Transformation worker initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Transformation worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.worker = null;
    }
  }

  private async process(payload: TransformationJobPayload): Promise<void> {
    this.logger.log(
      `Processing transformation job ${payload.jobId} for listing ${payload.listingId}`,
    );
    await this.service.executeTransformation(payload.workspaceId, payload);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) await this.worker.close();
  }
}
