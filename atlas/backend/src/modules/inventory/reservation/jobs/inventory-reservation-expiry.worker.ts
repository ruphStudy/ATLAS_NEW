import { Worker, Job, WorkerOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { InventoryReservationJobPayload } from '../../interfaces';
import { InventoryReservationService } from '../inventory-reservation.service';

@Injectable()
export class InventoryReservationExpiryWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InventoryReservationExpiryWorker.name);
  private worker: Worker<InventoryReservationJobPayload> | null = null;

  constructor(
    private readonly configService: ConfigurationService,
    private readonly reservationService: InventoryReservationService,
  ) {}

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

      this.worker = new Worker<InventoryReservationJobPayload>(
        QUEUE_NAMES.INVENTORY_RESERVATION_EXPIRY,
        async (job: Job<InventoryReservationJobPayload>) => {
          await this.process(job.data);
        },
        opts,
      );

      this.worker.on('completed', (job) =>
        this.logger.log(`Reservation expiry processed: ${job.data.reservationId}`),
      );
      this.worker.on('failed', (job, err) =>
        this.logger.error(`Reservation expiry failed: ${job?.data.reservationId} – ${err.message}`),
      );
      this.logger.log('Inventory Reservation Expiry worker initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Inventory Reservation Expiry worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.worker = null;
    }
  }

  private async process(payload: InventoryReservationJobPayload): Promise<void> {
    this.logger.log(`Checking expiry for reservation ${payload.reservationId}`);
    await this.reservationService.expire(payload.reservationId, payload.workspaceId);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }
}
