import { Worker, Job, WorkerOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { PricingEventPayload } from '../interfaces';

@Injectable()
export class PricingEventWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PricingEventWorker.name);
  private worker: Worker<PricingEventPayload> | null = null;

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

      this.worker = new Worker<PricingEventPayload>(
        QUEUE_NAMES.PRICING_EVENTS,
        async (job: Job<PricingEventPayload>) => {
          await this.process(job.data);
        },
        opts,
      );

      this.worker.on('completed', (job) =>
        this.logger.log(`Pricing event processed: ${job.data.event}`),
      );
      this.worker.on('failed', (job, err) =>
        this.logger.error(`Pricing event failed: ${job?.data.event} – ${err.message}`),
      );
      this.logger.log('Pricing Event worker initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Pricing Event worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.worker = null;
    }
  }

  private async process(payload: PricingEventPayload): Promise<void> {
    this.logger.log(
      `Processing pricing event: ${payload.event} for ${payload.pricingRecordId} in workspace ${payload.workspaceId}`,
    );
    // Downstream notification / webhook integration goes here.
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) await this.worker.close();
  }
}
