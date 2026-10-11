import { Queue, QueueOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { InventoryReservationJobPayload } from '../../interfaces';

@Injectable()
export class InventoryReservationExpiryQueue implements OnModuleDestroy {
  private readonly logger = new Logger(InventoryReservationExpiryQueue.name);
  private queue: Queue<InventoryReservationJobPayload> | null = null;

  constructor(private readonly configService: ConfigurationService) {
    this.initializeQueue();
  }

  private initializeQueue(): void {
    try {
      const redisConfig = this.configService.getRedisConfig();
      const opts: QueueOptions = {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
          password: redisConfig.password,
          tls: redisConfig.tls ? {} : undefined,
          db: redisConfig.db,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5_000 },
          removeOnComplete: 50,
          removeOnFail: 20,
        },
      };
      this.queue = new Queue<InventoryReservationJobPayload>(
        QUEUE_NAMES.INVENTORY_RESERVATION_EXPIRY,
        opts,
      );
      this.logger.log('Inventory Reservation Expiry queue initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Inventory Reservation Expiry queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.queue = null;
    }
  }

  private jobId(reservationId: string): string {
    return `reservation-expiry-${reservationId}`;
  }

  /** Schedules (or reschedules) a delayed expiry check for a reservation. */
  async scheduleExpiry(payload: InventoryReservationJobPayload, expiresAt: Date): Promise<void> {
    if (!this.queue) {
      this.logger.warn('Inventory Reservation Expiry queue unavailable — expiry not scheduled');
      return;
    }
    try {
      const delay = Math.max(0, expiresAt.getTime() - Date.now());
      await this.queue.add('reservation-expiry', payload, {
        jobId: this.jobId(payload.reservationId),
        delay,
      });
    } catch (error) {
      this.logger.error(
        `Failed to schedule reservation expiry: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /** Removes a pending expiry job (e.g. once a reservation reaches a terminal state early). */
  async cancelExpiry(reservationId: string): Promise<void> {
    if (!this.queue) return;
    try {
      const job = await this.queue.getJob(this.jobId(reservationId));
      await job?.remove();
    } catch (error) {
      this.logger.warn(
        `Failed to cancel reservation expiry job: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
    }
  }
}
