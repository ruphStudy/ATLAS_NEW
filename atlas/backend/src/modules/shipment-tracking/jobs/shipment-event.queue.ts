import { Queue, QueueOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { ShipmentJobPayload } from '../interfaces';
import { SHIPMENT_QUEUE_CONFIG } from '../constants';

@Injectable()
export class ShipmentEventQueue implements OnModuleDestroy {
  private readonly logger = new Logger(ShipmentEventQueue.name);
  private queue: Queue<ShipmentJobPayload> | null = null;

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
          attempts: SHIPMENT_QUEUE_CONFIG.ATTEMPTS,
          backoff: { type: 'exponential', delay: SHIPMENT_QUEUE_CONFIG.BACKOFF_DELAY_MS },
          removeOnComplete: SHIPMENT_QUEUE_CONFIG.REMOVE_ON_COMPLETE_COUNT,
          removeOnFail: SHIPMENT_QUEUE_CONFIG.REMOVE_ON_FAIL_COUNT,
        },
      };
      this.queue = new Queue<ShipmentJobPayload>(QUEUE_NAMES.SHIPMENT_EVENTS, opts);
      this.logger.log('Shipment Event queue initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Shipment Event queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.queue = null;
    }
  }

  async enqueue(payload: ShipmentJobPayload): Promise<void> {
    if (!this.queue) {
      this.logger.warn('Shipment Event queue unavailable — event skipped');
      return;
    }
    try {
      await this.queue.add('shipment-event', payload, {
        jobId: `shp-${payload.shipmentId}-${payload.event}-${Date.now()}`,
      });
      this.logger.log(`Queued event: ${payload.event} for ${payload.shipmentNumber}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue shipment event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      this.logger.log('Shipment Event queue closed');
    }
  }
}
