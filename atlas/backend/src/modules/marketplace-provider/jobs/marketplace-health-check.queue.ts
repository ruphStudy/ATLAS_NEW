import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ConfigurationService } from '@config/configuration.service';
import { QUEUE_NAMES } from '@common/constants';
import { MarketplaceHealthCheckJobPayload } from '../interfaces';
import { MARKETPLACE_PROVIDER_QUEUE_CONFIG } from '../constants';

@Injectable()
export class MarketplaceHealthCheckQueue implements OnModuleDestroy {
  private readonly logger = new Logger(MarketplaceHealthCheckQueue.name);
  private readonly queue: Queue<MarketplaceHealthCheckJobPayload>;

  constructor(configService: ConfigurationService) {
    const redis = configService.getRedisConfig();
    this.queue = new Queue<MarketplaceHealthCheckJobPayload>(
      QUEUE_NAMES.MARKETPLACE_PROVIDER_HEALTH_CHECK,
      {
        connection: { host: redis.host, port: redis.port, password: redis.password, db: redis.db },
      },
    );
  }

  async enqueue(payload: MarketplaceHealthCheckJobPayload): Promise<void> {
    await this.queue.add(
      `health-check-${payload.providerKey ?? 'all'}-${Date.now()}`,
      payload,
      {
        attempts: MARKETPLACE_PROVIDER_QUEUE_CONFIG.HEALTH_CHECK_ATTEMPTS,
        backoff: { type: 'exponential', delay: MARKETPLACE_PROVIDER_QUEUE_CONFIG.HEALTH_CHECK_BACKOFF_MS },
        removeOnComplete: MARKETPLACE_PROVIDER_QUEUE_CONFIG.HEALTH_CHECK_REMOVE_ON_COMPLETE,
        removeOnFail: MARKETPLACE_PROVIDER_QUEUE_CONFIG.HEALTH_CHECK_REMOVE_ON_FAIL,
      },
    );
    this.logger.debug(`Enqueued health check for provider: ${payload.providerKey ?? 'all'}`);
  }

  async enqueueAll(): Promise<void> {
    return this.enqueue({ providerKey: '', workspaceId: null });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
