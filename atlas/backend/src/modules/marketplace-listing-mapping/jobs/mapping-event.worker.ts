import { Worker, Job, WorkerOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { MappingEventPayload } from '../interfaces';

@Injectable()
export class MappingEventWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MappingEventWorker.name);
  private worker: Worker<MappingEventPayload> | null = null;

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

      this.worker = new Worker<MappingEventPayload>(
        QUEUE_NAMES.MARKETPLACE_MAPPING_EVENTS,
        async (job: Job<MappingEventPayload>) => {
          await this.process(job.data);
        },
        opts,
      );

      this.worker.on('completed', (job) =>
        this.logger.log(`Mapping event processed: ${job.data.event}`),
      );
      this.worker.on('failed', (job, err) =>
        this.logger.error(`Mapping event failed: ${job?.data.event} – ${err.message}`),
      );
      this.logger.log('Mapping Event worker initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Mapping Event worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.worker = null;
    }
  }

  private async process(payload: MappingEventPayload): Promise<void> {
    this.logger.log(
      `Processing mapping event: ${payload.event} for entity ${payload.entityId} in workspace ${payload.workspaceId}`,
    );
    // Downstream notification / webhook integration goes here.
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) await this.worker.close();
  }
}
