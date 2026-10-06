import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { MarketplaceProviderEventPayload } from '../interfaces';
import { MARKETPLACE_PROVIDER_QUEUE_CONFIG } from '../constants';

@Injectable()
export class MarketplaceProviderEventQueue implements OnModuleDestroy {
  private readonly logger = new Logger(MarketplaceProviderEventQueue.name);
  private readonly queue: Queue<MarketplaceProviderEventPayload>;

  constructor() {
    this.queue = new Queue<MarketplaceProviderEventPayload>(
      QUEUE_NAMES.MARKETPLACE_PROVIDER_EVENTS,
      {
        connection: {
          host: process.env['REDIS_HOST'] ?? 'localhost',
          port: Number(process.env['REDIS_PORT'] ?? 6379),
        },
      },
    );
  }

  async enqueue(payload: MarketplaceProviderEventPayload): Promise<void> {
    await this.queue.add(
      `${payload.event}-${payload.providerKey}-${Date.now()}`,
      payload,
      {
        attempts: MARKETPLACE_PROVIDER_QUEUE_CONFIG.EVENT_ATTEMPTS,
        backoff: { type: 'exponential', delay: MARKETPLACE_PROVIDER_QUEUE_CONFIG.EVENT_BACKOFF_MS },
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    );
    this.logger.debug(`Enqueued event '${payload.event}' for provider '${payload.providerKey}'`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
