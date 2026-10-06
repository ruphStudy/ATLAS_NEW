import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ConfigurationService } from '@config/configuration.service';
import { QUEUE_NAMES } from '@common/constants';
import { SupplierProviderExpansionEventPayload } from '../interfaces';
import { SUPPLIER_PROVIDER_EXPANSION_EVENT_QUEUE_CONFIG } from '../constants';

@Injectable()
export class SupplierProviderExpansionEventQueue implements OnModuleDestroy {
  private readonly logger = new Logger(SupplierProviderExpansionEventQueue.name);
  private readonly queue: Queue;

  constructor(configService: ConfigurationService) {
    const redis = configService.getRedisConfig();
    this.queue = new Queue(QUEUE_NAMES.SUPPLIER_PROVIDER_EXPANSION_EVENTS, {
      connection: { host: redis.host, port: redis.port, password: redis.password, db: redis.db },
      defaultJobOptions: {
        attempts: SUPPLIER_PROVIDER_EXPANSION_EVENT_QUEUE_CONFIG.ATTEMPTS,
        backoff: { type: 'exponential', delay: SUPPLIER_PROVIDER_EXPANSION_EVENT_QUEUE_CONFIG.BACKOFF_MS },
        removeOnComplete: SUPPLIER_PROVIDER_EXPANSION_EVENT_QUEUE_CONFIG.REMOVE_ON_COMPLETE,
        removeOnFail: SUPPLIER_PROVIDER_EXPANSION_EVENT_QUEUE_CONFIG.REMOVE_ON_FAIL,
      },
    });
  }

  async enqueue(payload: SupplierProviderExpansionEventPayload): Promise<void> {
    try {
      await this.queue.add(payload.event, payload);
    } catch (err) {
      this.logger.warn(`Failed to enqueue supplier provider expansion event '${payload.event}': ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
