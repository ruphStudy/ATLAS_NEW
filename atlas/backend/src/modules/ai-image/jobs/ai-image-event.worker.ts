import { Worker, Job, WorkerOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { AiImageEventPayload } from '../interfaces';

@Injectable()
export class AiImageEventWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiImageEventWorker.name);
  private worker: Worker<AiImageEventPayload> | null = null;

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

      this.worker = new Worker<AiImageEventPayload>(
        QUEUE_NAMES.AI_IMAGE_EVENTS,
        async (job: Job<AiImageEventPayload>) => {
          await this.process(job.data);
        },
        opts,
      );

      this.worker.on('completed', (job) =>
        this.logger.log(`AI image event processed: ${job.data.event}`),
      );
      this.worker.on('failed', (job, err) =>
        this.logger.error(`AI image event failed: ${job?.data.event} – ${err.message}`),
      );
      this.logger.log('AI Image Event worker initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize AI Image Event worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.worker = null;
    }
  }

  private async process(payload: AiImageEventPayload): Promise<void> {
    this.logger.log(
      `Processing AI image event: ${payload.event} for image set ${payload.imageSetId} in workspace ${payload.workspaceId}`,
    );
    // Downstream notification / integration logic goes here.
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }
}
