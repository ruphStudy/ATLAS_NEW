import { Worker, Job } from 'bullmq';
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { ProcurementJobPayload } from '../interfaces';
import { PROCUREMENT_QUEUE_CONFIG } from '../constants';

@Injectable()
export class ProcurementWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProcurementWorker.name);
  private worker: Worker<ProcurementJobPayload> | null = null;

  constructor(private readonly configService: ConfigurationService) {}

  onModuleInit(): void {
    this.initializeWorker();
  }

  private initializeWorker(): void {
    try {
      const redisConfig = this.configService.getRedisConfig();
      this.worker = new Worker<ProcurementJobPayload>(
        QUEUE_NAMES.PROCUREMENT,
        async (job: Job<ProcurementJobPayload>) => this.processJob(job),
        {
          connection: {
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
            db: redisConfig.db,
          },
          concurrency: PROCUREMENT_QUEUE_CONFIG.CONCURRENCY,
        },
      );
      this.worker.on('completed', (job) =>
        this.logger.log(`Procurement job ${job.id} completed`),
      );
      this.worker.on('failed', (job, err) =>
        this.logger.error(`Procurement job ${job?.id} failed: ${err.message}`),
      );
      this.logger.log('Procurement worker initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Procurement worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.worker = null;
    }
  }

  private async processJob(job: Job<ProcurementJobPayload>): Promise<void> {
    const { procurementId, procurementNumber, workspaceId, event, changedBy } = job.data;
    this.logger.log(
      `Processing procurement event: event=${event} procurement=${procurementNumber} workspace=${workspaceId}${changedBy ? ` by=${changedBy}` : ''}`,
    );
    // TODO: Integrate with NotificationsService when infrastructure is ready.
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.logger.log('Procurement worker closed');
    }
  }
}
