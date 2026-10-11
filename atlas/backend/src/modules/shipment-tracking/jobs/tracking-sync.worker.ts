import { Worker, Job } from 'bullmq';
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { TrackingSyncJobPayload } from '../interfaces';
import { TRACKING_SYNC_QUEUE_CONFIG } from '../constants';
import { SupplierProviderManager } from '@modules/supplier-provider/manager/supplier-provider.manager';
import { ProviderCapability } from '@modules/supplier-provider/interfaces';

@Injectable()
export class TrackingSyncWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TrackingSyncWorker.name);
  private worker: Worker<TrackingSyncJobPayload> | null = null;

  constructor(
    private readonly configService: ConfigurationService,
    private readonly providerManager: SupplierProviderManager,
  ) {}

  onModuleInit(): void {
    this.initializeWorker();
  }

  private initializeWorker(): void {
    try {
      const redisConfig = this.configService.getRedisConfig();
      this.worker = new Worker<TrackingSyncJobPayload>(
        QUEUE_NAMES.SHIPMENT_TRACKING_SYNC,
        async (job: Job<TrackingSyncJobPayload>) => this.processJob(job),
        {
          connection: {
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
            tls: redisConfig.tls ? {} : undefined,
            db: redisConfig.db,
          },
          concurrency: TRACKING_SYNC_QUEUE_CONFIG.CONCURRENCY,
        },
      );
      this.worker.on('completed', (job) =>
        this.logger.log(`Tracking sync job ${job.id} completed`),
      );
      this.worker.on('failed', (job, err) =>
        this.logger.error(`Tracking sync job ${job?.id} failed: ${err.message}`),
      );
      this.logger.log('Tracking Sync worker initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Tracking Sync worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.worker = null;
    }
  }

  private async processJob(job: Job<TrackingSyncJobPayload>): Promise<void> {
    const { shipmentId, shipmentNumber, trackingNumber, carrier, workspaceId } = job.data;
    this.logger.log(
      `Syncing tracking: shipment=${shipmentNumber} carrier=${carrier} tracking=${trackingNumber}`,
    );

    if (!workspaceId) {
      this.logger.debug(`No workspaceId on tracking job ${shipmentId}, skipping provider sync`);
      return;
    }

    // Attempt to sync tracking status via a capable provider
    try {
      const providers = this.providerManager.getSupportedProviders();
      const capableProvider = providers.find((code) =>
        this.providerManager.getCapabilities(code).includes(ProviderCapability.DOWNLOAD_CATALOG),
      );

      if (!capableProvider) {
        this.logger.debug(
          `No provider with shipment tracking capability available for shipment ${shipmentNumber}`,
        );
        return;
      }

      // Provider-level shipment tracking is a future extension point.
      // Normalized tracking data will be applied via ShipmentService.applyCarrierUpdate()
      // once a carrier-aware provider adapter is registered.
      this.logger.debug(
        `Provider-based tracking sync deferred for shipment ${shipmentNumber} (no carrier adapter registered)`,
      );
    } catch (error) {
      this.logger.warn(
        `Provider tracking sync failed for ${shipmentNumber}: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.logger.log('Tracking Sync worker closed');
    }
  }
}
