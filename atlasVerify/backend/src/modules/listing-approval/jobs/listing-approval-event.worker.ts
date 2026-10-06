import { Worker, Job, WorkerOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { ApprovalEventPayload } from '../interfaces';

@Injectable()
export class ListingApprovalEventWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ListingApprovalEventWorker.name);
  private worker: Worker<ApprovalEventPayload> | null = null;

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

      this.worker = new Worker<ApprovalEventPayload>(
        QUEUE_NAMES.LISTING_APPROVAL_EVENTS,
        async (job: Job<ApprovalEventPayload>) => {
          await this.process(job.data);
        },
        opts,
      );

      this.worker.on('completed', (job) =>
        this.logger.log(`Approval event processed: ${job.data.event}`),
      );
      this.worker.on('failed', (job, err) =>
        this.logger.error(`Approval event failed: ${job?.data.event} – ${err.message}`),
      );
      this.logger.log('Listing Approval Event worker initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Listing Approval Event worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.worker = null;
    }
  }

  private async process(payload: ApprovalEventPayload): Promise<void> {
    this.logger.log(
      `Processing approval event: ${payload.event} for ${payload.approvalId} in workspace ${payload.workspaceId}`,
    );
    // Downstream integration / webhook dispatch goes here.
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }
}
