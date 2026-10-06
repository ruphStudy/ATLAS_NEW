import { Worker, Job, WorkerOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import {
  ListingEvent,
  MarketplaceListingStatus,
  MarketplaceListingTransformJobPayload,
} from '../interfaces';
import { MarketplaceListingEngine } from '../engine/marketplace-listing.engine';
import { ListingRepository } from '../listing.repository';
import { ListingEventQueue } from './listing-event.queue';
import { TransformationStatus } from '@modules/marketplace-listing-mapping/interfaces';

@Injectable()
export class MarketplaceListingTransformWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MarketplaceListingTransformWorker.name);
  private worker: Worker<MarketplaceListingTransformJobPayload> | null = null;

  constructor(
    private readonly configService: ConfigurationService,
    private readonly marketplaceEngine: MarketplaceListingEngine,
    private readonly repository: ListingRepository,
    private readonly eventQueue: ListingEventQueue,
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
          db: redisConfig.db,
        },
        concurrency: 3,
      };

      this.worker = new Worker<MarketplaceListingTransformJobPayload>(
        QUEUE_NAMES.MARKETPLACE_LISTING_TRANSFORMATION,
        async (job: Job<MarketplaceListingTransformJobPayload>) => {
          await this.process(job.data);
        },
        opts,
      );

      this.worker.on('completed', (job) =>
        this.logger.log(`Marketplace listing transformation completed for ${job.data.marketplaceListingId}`),
      );
      this.worker.on('failed', (job, err) =>
        this.logger.error(`Marketplace listing transformation failed for ${job?.data.marketplaceListingId}: ${err.message}`),
      );
      this.logger.log('Marketplace Listing Transform worker initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Marketplace Listing Transform worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.worker = null;
    }
  }

  private async process(payload: MarketplaceListingTransformJobPayload): Promise<void> {
    const {
      marketplaceListingId,
      universalListingId,
      catalogProductId,
      workspaceId,
      marketplaceKey,
      country,
      isDryRun,
    } = payload;

    await this.repository.updateMarketplaceListing(marketplaceListingId, workspaceId, {
      status: MarketplaceListingStatus.TRANSFORMING,
      transformStartedAt: new Date(),
    });

    try {
      const universalListing = await this.repository.findUniversalListingById(universalListingId, workspaceId);
      if (!universalListing) throw new Error(`Universal listing ${universalListingId} not found`);

      const content = universalListing['content'] as Record<string, unknown>;

      const transformResult = await this.marketplaceEngine.transform(
        universalListingId,
        catalogProductId,
        content as never,
        marketplaceKey,
        { isDryRun, country, workspaceId },
      );

      const tr = transformResult.transformationResult;
      const succeeded = tr.status === TransformationStatus.COMPLETED;

      await this.repository.updateMarketplaceListing(marketplaceListingId, workspaceId, {
        status: succeeded
          ? (isDryRun ? MarketplaceListingStatus.TRANSFORMED : MarketplaceListingStatus.READY)
          : MarketplaceListingStatus.FAILED,
        schemaVersion: transformResult.schemaVersion,
        transformedPayload: tr.payload,
        fieldTrace: tr.fieldTrace,
        warnings: tr.warnings,
        errors: tr.errors,
        readinessScore: null,
        readinessStatus: null,
        transformCompletedAt: new Date(),
        failedAt: succeeded ? null : new Date(),
        errorMessage: succeeded ? null : tr.errors.map((e) => e.message).join('; '),
      });

      await this.repository.createMarketplaceListingHistory(marketplaceListingId, workspaceId, {
        fromStatus: MarketplaceListingStatus.TRANSFORMING,
        toStatus: succeeded ? MarketplaceListingStatus.READY : MarketplaceListingStatus.FAILED,
        version: universalListing['version'] as number,
        reason: succeeded ? 'Marketplace transformation completed' : 'Transformation failed',
        changedBy: payload.triggeredBy ?? null,
        snapshotPayload: tr.payload,
      });

      await this.eventQueue.enqueue({
        listingId: universalListingId,
        catalogProductId,
        workspaceId,
        marketplace: marketplaceKey as never,
        event: succeeded ? ListingEvent.MARKETPLACE_TRANSFORMED : ListingEvent.MARKETPLACE_VALIDATION_FAILED,
        triggeredBy: payload.triggeredBy,
        metadata: { marketplaceKey, country, readinessScore: null },
      });

      this.logger.log(
        `Marketplace listing ${marketplaceListingId} transformed: status=${succeeded ? 'READY' : 'FAILED'}`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Marketplace listing transformation failed for ${marketplaceListingId}: ${errorMessage}`);

      await this.repository.updateMarketplaceListing(marketplaceListingId, workspaceId, {
        status: MarketplaceListingStatus.FAILED,
        errorMessage,
        failedAt: new Date(),
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) await this.worker.close();
  }
}
