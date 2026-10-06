import { Worker, Job, WorkerOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { InspectionJobPayload } from '../interfaces';

@Injectable()
export class InspectionEventWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InspectionEventWorker.name);
  private worker: Worker<InspectionJobPayload> | null = null;

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

      this.worker = new Worker<InspectionJobPayload>(
        QUEUE_NAMES.QUALITY_INSPECTION,
        async (job: Job<InspectionJobPayload>) => {
          await this.process(job.data);
        },
        opts,
      );

      this.worker.on('completed', (job) =>
        this.logger.log(
          `Inspection event processed: ${job.data.event} for ${job.data.inspectionNumber}`,
        ),
      );
      this.worker.on('failed', (job, err) =>
        this.logger.error(
          `Inspection event failed: ${job?.data.event} – ${err.message}`,
        ),
      );
      this.logger.log('Inspection Event worker initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Inspection Event worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.worker = null;
    }
  }

  private async process(payload: InspectionJobPayload): Promise<void> {
    this.logger.log(
      `Processing inspection event: ${payload.event} for inspection ${payload.inspectionNumber} in workspace ${payload.workspaceId}`,
    );
    // Downstream notification / integration logic goes here.
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }
}
