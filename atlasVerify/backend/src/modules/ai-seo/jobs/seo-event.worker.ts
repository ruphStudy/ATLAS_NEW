import { Worker, Job, WorkerOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { SeoEventPayload } from '../interfaces';

@Injectable()
export class SeoEventWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SeoEventWorker.name);
  private worker: Worker<SeoEventPayload> | null = null;

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

      this.worker = new Worker<SeoEventPayload>(
        QUEUE_NAMES.AI_SEO_EVENTS,
        async (job: Job<SeoEventPayload>) => {
          await this.process(job.data);
        },
        opts,
      );

      this.worker.on('completed', (job) =>
        this.logger.log(`SEO event processed: ${job.data.event}`),
      );
      this.worker.on('failed', (job, err) =>
        this.logger.error(`SEO event failed: ${job?.data.event} – ${err.message}`),
      );
      this.logger.log('SEO Event worker initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize SEO Event worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.worker = null;
    }
  }

  private async process(payload: SeoEventPayload): Promise<void> {
    this.logger.log(
      `Processing SEO event: ${payload.event} for ${payload.seoId} in workspace ${payload.workspaceId}`,
    );
    // Downstream notification / integration logic goes here.
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }
}
