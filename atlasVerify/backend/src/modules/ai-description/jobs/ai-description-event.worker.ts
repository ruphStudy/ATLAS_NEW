import { Worker, Job, WorkerOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { AiDescriptionJobPayload } from '../interfaces';

@Injectable()
export class AiDescriptionEventWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiDescriptionEventWorker.name);
  private worker: Worker<AiDescriptionJobPayload> | null = null;

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

      this.worker = new Worker<AiDescriptionJobPayload>(
        QUEUE_NAMES.AI_DESCRIPTION_EVENTS,
        async (job: Job<AiDescriptionJobPayload>) => {
          await this.process(job.data);
        },
        opts,
      );

      this.worker.on('completed', (job) =>
        this.logger.log(`AI description event processed: ${job.data.event}`),
      );
      this.worker.on('failed', (job, err) =>
        this.logger.error(`AI description event failed: ${job?.data.event} – ${err.message}`),
      );
      this.logger.log('AI Description Event worker initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize AI Description Event worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.worker = null;
    }
  }

  private async process(payload: AiDescriptionJobPayload): Promise<void> {
    this.logger.log(
      `Processing AI description event: ${payload.event} for ${payload.descriptionId} in workspace ${payload.workspaceId}`,
    );
    // Downstream notification / integration logic goes here.
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }
}
