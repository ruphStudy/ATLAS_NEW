import { Worker, Job } from 'bullmq';
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { ShipmentJobPayload } from '../interfaces';
import { SHIPMENT_QUEUE_CONFIG } from '../constants';

@Injectable()
export class ShipmentEventWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ShipmentEventWorker.name);
  private worker: Worker<ShipmentJobPayload> | null = null;

  constructor(private readonly configService: ConfigurationService) {}

  onModuleInit(): void {
    this.initializeWorker();
  }

  private initializeWorker(): void {
    try {
      const redisConfig = this.configService.getRedisConfig();
      this.worker = new Worker<ShipmentJobPayload>(
        QUEUE_NAMES.SHIPMENT_EVENTS,
        async (job: Job<ShipmentJobPayload>) => this.processJob(job),
        {
          connection: {
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
            tls: redisConfig.tls ? {} : undefined,
            db: redisConfig.db,
          },
          concurrency: SHIPMENT_QUEUE_CONFIG.CONCURRENCY,
        },
      );
      this.worker.on('completed', (job) =>
        this.logger.log(`Shipment event job ${job.id} completed`),
      );
      this.worker.on('failed', (job, err) =>
        this.logger.error(`Shipment event job ${job?.id} failed: ${err.message}`),
      );
      this.logger.log('Shipment Event worker initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Shipment Event worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.worker = null;
    }
  }

  private async processJob(job: Job<ShipmentJobPayload>): Promise<void> {
    const { shipmentId, shipmentNumber, workspaceId, event } = job.data;
    this.logger.log(
      `Processing shipment event: event=${event} shipment=${shipmentNumber} workspace=${workspaceId}`,
    );
    // TODO: Integrate with NotificationsService when infrastructure is ready.
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.logger.log('Shipment Event worker closed');
    }
  }
}
