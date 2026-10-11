import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { ConfigurationService } from '@config/configuration.service';
import { QUEUE_NAMES } from '@common/constants';
import { MarketplaceHealthCheckJobPayload } from '../interfaces';
import { MarketplaceProviderRegistry } from '../registry/marketplace-provider.registry';
import { MarketplaceHealthMonitor } from '../health/marketplace-health.monitor';
import { MARKETPLACE_PROVIDER_QUEUE_CONFIG } from '../constants';

/**
 * BullMQ worker for scheduled marketplace provider health checks.
 * Runs health checks without blocking business-critical request paths.
 */
@Injectable()
export class MarketplaceHealthCheckWorker implements OnModuleInit {
  private readonly logger = new Logger(MarketplaceHealthCheckWorker.name);
  private worker?: Worker;

  constructor(
    private readonly registry: MarketplaceProviderRegistry,
    private readonly healthMonitor: MarketplaceHealthMonitor,
    private readonly configService: ConfigurationService,
  ) {}

  onModuleInit(): void {
    const redis = this.configService.getRedisConfig();
    this.worker = new Worker<MarketplaceHealthCheckJobPayload>(
      QUEUE_NAMES.MARKETPLACE_PROVIDER_HEALTH_CHECK,
      async (job: Job<MarketplaceHealthCheckJobPayload>) => {
        await this.process(job);
      },
      {
        concurrency: 5,
        connection: { host: redis.host, port: redis.port, password: redis.password, db: redis.db, tls: redis.tls ? {} : undefined },
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.debug(`Health check job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Health check job ${job?.id} failed: ${err.message}`);
    });
  }

  private async process(job: Job<MarketplaceHealthCheckJobPayload>): Promise<void> {
    const { providerKey, accountId } = job.data;

    if (providerKey) {
      if (!this.registry.isRegistered(providerKey)) {
        this.logger.warn(`Health check: provider '${providerKey}' not registered`);
        return;
      }
      const adapter = this.registry.get(providerKey);
      await this.healthMonitor.checkOne(adapter, accountId ?? undefined);
    } else {
      await this.healthMonitor.checkAll();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
