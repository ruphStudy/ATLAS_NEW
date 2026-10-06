import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { HealthEventPayload, MarketplaceHealthEvent } from '../interfaces';
import { MP_HEALTH_QUEUE_CONFIG } from '../constants';

@Injectable()
export class MarketplaceHealthEventQueue implements OnModuleDestroy {
  private readonly logger = new Logger(MarketplaceHealthEventQueue.name);
  private readonly queue: Queue<HealthEventPayload>;

  constructor() {
    this.queue = new Queue<HealthEventPayload>(QUEUE_NAMES.MARKETPLACE_HEALTH_EVENTS, {
      connection: {
        host: process.env['REDIS_HOST'] ?? 'localhost',
        port: Number(process.env['REDIS_PORT'] ?? 6379),
      },
      defaultJobOptions: {
        attempts: MP_HEALTH_QUEUE_CONFIG.ATTEMPTS,
        backoff: { type: 'exponential', delay: MP_HEALTH_QUEUE_CONFIG.BACKOFF_MS },
        removeOnComplete: MP_HEALTH_QUEUE_CONFIG.REMOVE_ON_COMPLETE,
        removeOnFail: MP_HEALTH_QUEUE_CONFIG.REMOVE_ON_FAIL,
      },
    });
  }

  async enqueue(payload: HealthEventPayload): Promise<void> {
    try {
      await this.queue.add(payload.event, payload);
    } catch (err) {
      // Non-critical — health checks must not fail because of queue issues
      this.logger.warn(
        `Failed to enqueue health event '${payload.event}' for '${payload.providerKey}': ${(err as Error).message}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
