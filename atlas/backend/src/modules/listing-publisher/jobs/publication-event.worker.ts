import { Worker, Job, WorkerOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { PublicationEventPayload } from '../interfaces';

@Injectable()
export class PublicationEventWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PublicationEventWorker.name);
  private worker: Worker<PublicationEventPayload> | null = null;

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

      this.worker = new Worker<PublicationEventPayload>(
        QUEUE_NAMES.PUBLICATION_EVENTS,
        async (job: Job<PublicationEventPayload>) => {
          await this.process(job.data);
        },
        opts,
      );

      this.worker.on('completed', (job) =>
        this.logger.log(`Publication event processed: ${job.data.event}`),
      );
      this.worker.on('failed', (job, err) =>
        this.logger.error(`Publication event failed: ${job?.data.event} – ${err.message}`),
      );
      this.logger.log('Publication Event worker initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Publication Event worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.worker = null;
    }
  }

  private async process(payload: PublicationEventPayload): Promise<void> {
    this.logger.log(
      `Processing publication event: ${payload.event} for ${payload.publicationId} in workspace ${payload.workspaceId}`,
    );
    // Downstream webhook / notification dispatch goes here.
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }
}
