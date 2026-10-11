import { Worker, Job, WorkerOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import {
  PublicationEvent,
  PublicationMarketplace,
  PublicationStatus,
  PublishJobPayload,
  SyncStatus,
} from '../interfaces';
import { MarketplaceAdapterEngine } from '../engine/marketplace-adapter.engine';
import { ListingPublisherRepository } from '../listing-publisher.repository';
import { PublicationEventQueue } from './publication-event.queue';
import { LISTING_PUBLISHER_CONSTANTS } from '../constants';
import { ListingService } from '../../listing/listing.service';
import { ListingStatus } from '../../listing/interfaces';

const PUBLISHABLE_LISTING_STATUSES: ListingStatus[] = [
  ListingStatus.APPROVED,
  ListingStatus.PUBLISHED,
];

@Injectable()
export class PublishWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PublishWorker.name);
  private worker: Worker<PublishJobPayload> | null = null;

  constructor(
    private readonly configService: ConfigurationService,
    private readonly adapterEngine: MarketplaceAdapterEngine,
    private readonly repository: ListingPublisherRepository,
    private readonly eventQueue: PublicationEventQueue,
    private readonly listingService: ListingService,
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
          tls: redisConfig.tls ? {} : undefined,
          db: redisConfig.db,
        },
        concurrency: 5,
      };

      this.worker = new Worker<PublishJobPayload>(
        QUEUE_NAMES.LISTING_PUBLISH,
        async (job: Job<PublishJobPayload>) => {
          await this.process(job.data);
        },
        opts,
      );

      this.worker.on('completed', (job) =>
        this.logger.log(`Publish job completed for ${job.data.publicationId}`),
      );
      this.worker.on('failed', (job, err) =>
        this.logger.error(`Publish job failed for ${job?.data.publicationId}: ${err.message}`),
      );
      this.logger.log('Publish worker initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Publish worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.worker = null;
    }
  }

  private async process(payload: PublishJobPayload): Promise<void> {
    const { publicationId, workspaceId, marketplace, trigger } = payload;

    await this.repository.update(publicationId, workspaceId, {
      status: PublicationStatus.PUBLISHING,
      errorMessage: null,
      errorCode: null,
      failedAt: null,
    });

    try {
      const record = await this.repository.findById(publicationId, workspaceId);
      if (!record) throw new Error(`Publication record ${publicationId} not found`);

      const existingMarketplaceListingId = record['marketplaceListingId'] as string | null;

      // Real listing content — workspace-scoped; throws if the listing
      // doesn't exist or belongs to a different workspace.
      const listing = await this.listingService.findById(payload.listingId, workspaceId);
      if (!PUBLISHABLE_LISTING_STATUSES.includes(listing.status)) {
        throw new Error(
          `Listing ${payload.listingId} is not publishable (status: ${listing.status})`,
        );
      }
      if (!listing.content?.title || !listing.content?.pricing) {
        throw new Error(
          `Listing ${payload.listingId} has no title/pricing content to publish`,
        );
      }

      const listingContent: Record<string, unknown> = {
        title: listing.content.title,
        description: listing.content.description ?? undefined,
        pricing: listing.content.pricing,
        price: {
          amount: listing.content.pricing.sellingPrice,
          currencyCode: listing.content.pricing.currency,
        },
      };

      if (marketplace === PublicationMarketplace.AMAZON) {
        const sku = await this.repository.findCatalogProductSku(
          payload.catalogProductId,
          workspaceId,
        );
        if (!sku) {
          throw new Error(
            `Catalog product ${payload.catalogProductId} has no SKU — cannot publish to Amazon`,
          );
        }
        listingContent.sku = sku;
      }

      // Validate before publishing
      const validation = await this.adapterEngine.validate(marketplace, listingContent);
      if (!validation.valid) {
        throw new Error(`Marketplace validation failed: ${validation.errors.join(', ')}`);
      }

      const result = await this.adapterEngine.publish(
        marketplace,
        listingContent,
        existingMarketplaceListingId,
        { workspaceId, marketplaceAccountId: payload.marketplaceAccountId },
      );

      if (!result.success) {
        throw new Error(result.errorMessage ?? 'Marketplace publish failed');
      }

      const nextVersion = (record['publicationVersion'] as number) + (existingMarketplaceListingId ? 1 : 0);

      await this.repository.update(publicationId, workspaceId, {
        status: PublicationStatus.PUBLISHED,
        marketplaceListingId: result.marketplaceListingId,
        marketplaceUrl: result.marketplaceUrl,
        marketplaceResponse: result.marketplaceResponse,
        publicationVersion: nextVersion,
        publishedAt: new Date(),
        syncStatus: SyncStatus.IN_SYNC,
        lastSyncedAt: new Date(),
        retryCount: payload.retryCount ?? 0,
      });

      await this.repository.createHistoryEntry({
        publicationId,
        workspaceId,
        fromStatus: PublicationStatus.PUBLISHING,
        toStatus: PublicationStatus.PUBLISHED,
        publicationVersion: nextVersion,
        trigger,
        reason: 'Successfully published to marketplace',
        changedBy: payload.triggeredBy ?? null,
        marketplaceListingId: result.marketplaceListingId ?? null,
        errorMessage: null,
      });

      await this.eventQueue.enqueue({
        publicationId,
        listingId: payload.listingId,
        catalogProductId: payload.catalogProductId,
        workspaceId,
        marketplace,
        event: PublicationEvent.PUBLISHED,
        triggeredBy: payload.triggeredBy,
        metadata: {
          marketplaceListingId: result.marketplaceListingId,
          marketplaceUrl: result.marketplaceUrl,
        },
      });

      // Emit completion event after publish
      await this.eventQueue.enqueue({
        publicationId,
        listingId: payload.listingId,
        catalogProductId: payload.catalogProductId,
        workspaceId,
        marketplace,
        event: PublicationEvent.COMPLETED,
        triggeredBy: payload.triggeredBy,
      });

      this.logger.log(
        `Published ${publicationId} to ${marketplace}: ${result.marketplaceListingId}`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Publish failed for ${publicationId}: ${errorMessage}`);

      const record = await this.repository.findById(publicationId, workspaceId);
      const currentRetry = (payload.retryCount ?? 0) + 1;

      await this.repository.update(publicationId, workspaceId, {
        status: PublicationStatus.FAILED,
        errorMessage,
        failedAt: new Date(),
        syncStatus: SyncStatus.SYNC_FAILED,
        retryCount: currentRetry,
      });

      await this.repository.createHistoryEntry({
        publicationId,
        workspaceId,
        fromStatus: PublicationStatus.PUBLISHING,
        toStatus: PublicationStatus.FAILED,
        publicationVersion: (record?.['publicationVersion'] as number) ?? 1,
        trigger,
        reason: errorMessage,
        changedBy: payload.triggeredBy ?? null,
        marketplaceListingId: null,
        errorMessage,
      });

      await this.eventQueue.enqueue({
        publicationId,
        listingId: payload.listingId,
        catalogProductId: payload.catalogProductId,
        workspaceId,
        marketplace,
        event: PublicationEvent.FAILED,
        triggeredBy: payload.triggeredBy,
        metadata: { errorMessage, retryCount: currentRetry },
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }
}
