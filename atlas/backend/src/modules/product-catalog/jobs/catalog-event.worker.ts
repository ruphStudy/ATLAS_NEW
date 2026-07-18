import { Worker, Job, WorkerOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { CatalogJobPayload } from '../interfaces';

@Injectable()
export class CatalogEventWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CatalogEventWorker.name);
  private worker: Worker<CatalogJobPayload> | null = null;

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
          db: redisConfig.db,
        },
        concurrency: 5,
      };

      this.worker = new Worker<CatalogJobPayload>(
        QUEUE_NAMES.PRODUCT_CATALOG,
        async (job: Job<CatalogJobPayload>) => {
          await this.process(job.data);
        },
        opts,
      );

      this.worker.on('completed', (job) =>
        this.logger.log(
          `Catalog event processed: ${job.data.event} for ${job.data.catalogSku}`,
        ),
      );
      this.worker.on('failed', (job, err) =>
        this.logger.error(
          `Catalog event failed: ${job?.data.event} – ${err.message}`,
        ),
      );
      this.logger.log('Catalog Event worker initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Catalog Event worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.worker = null;
    }
  }

  private async process(payload: CatalogJobPayload): Promise<void> {
    this.logger.log(
      `Processing catalog event: ${payload.event} for catalog ${payload.catalogSku} in workspace ${payload.workspaceId}`,
    );
    // Downstream notification / integration logic goes here.
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }
}
