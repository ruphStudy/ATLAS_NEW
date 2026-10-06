import { Worker, Job, WorkerOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { ListingEventPayload } from '../interfaces';

@Injectable()
export class ListingEventWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ListingEventWorker.name);
  private worker: Worker<ListingEventPayload> | null = null;

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

      this.worker = new Worker<ListingEventPayload>(
        QUEUE_NAMES.LISTING_EVENTS,
        async (job: Job<ListingEventPayload>) => {
          await this.process(job.data);
        },
        opts,
      );

      this.worker.on('completed', (job) =>
        this.logger.log(`Listing event processed: ${job.data.event}`),
      );
      this.worker.on('failed', (job, err) =>
        this.logger.error(`Listing event failed: ${job?.data.event} – ${err.message}`),
      );
      this.logger.log('Listing Event worker initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Listing Event worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.worker = null;
    }
  }

  private async process(payload: ListingEventPayload): Promise<void> {
    this.logger.log(
      `Processing listing event: ${payload.event} for ${payload.listingId} in workspace ${payload.workspaceId}`,
    );
    // Downstream notification / marketplace integration goes here.
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }
}
