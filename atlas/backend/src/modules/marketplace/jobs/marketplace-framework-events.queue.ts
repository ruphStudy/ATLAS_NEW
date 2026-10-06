import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ConfigurationService } from '@config/configuration.service';
import { QUEUE_NAMES } from '@common/constants';
import { MarketplaceFrameworkEventPayload } from '../interfaces';

@Injectable()
export class MarketplaceFrameworkEventQueue implements OnModuleDestroy {
  private readonly logger = new Logger(MarketplaceFrameworkEventQueue.name);
  private readonly queue: Queue<MarketplaceFrameworkEventPayload>;

  constructor(configService: ConfigurationService) {
    const redis = configService.getRedisConfig();
    this.queue = new Queue<MarketplaceFrameworkEventPayload>(
      QUEUE_NAMES.MARKETPLACE_FRAMEWORK_EVENTS,
      {
        connection: { host: redis.host, port: redis.port, password: redis.password, db: redis.db },
      },
    );
  }

  async enqueue(payload: MarketplaceFrameworkEventPayload): Promise<void> {
    await this.queue.add(
      `${payload.event}-${payload.workspaceId}-${payload.marketplaceKey}-${Date.now()}`,
      payload,
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2_000 },
        removeOnComplete: 1_000,
        removeOnFail: 5_000,
      },
    );
    this.logger.debug(
      `Enqueued framework event '${payload.event}' for '${payload.marketplaceKey}' in workspace '${payload.workspaceId}'`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
