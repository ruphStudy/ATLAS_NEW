import { Worker, Job, WorkerOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import {
  BulkPublishJobPayload,
  PublicationStatus,
  PublishTrigger,
  SyncStatus,
} from '../interfaces';
import { ListingPublisherRepository } from '../listing-publisher.repository';
import { PublishQueue } from './publish.queue';
import { MarketplaceAccountResolver } from '../marketplace-account-resolver.service';

@Injectable()
export class BulkPublishWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BulkPublishWorker.name);
  private worker: Worker<BulkPublishJobPayload> | null = null;

  constructor(
    private readonly configService: ConfigurationService,
    private readonly repository: ListingPublisherRepository,
    private readonly publishQueue: PublishQueue,
    private readonly accountResolver: MarketplaceAccountResolver,
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
        concurrency: 2,
      };

      this.worker = new Worker<BulkPublishJobPayload>(
        QUEUE_NAMES.LISTING_BULK_PUBLISH,
        async (job: Job<BulkPublishJobPayload>) => {
          await this.process(job.data);
        },
        opts,
      );

      this.worker.on('completed', (job) =>
        this.logger.log(
          `Bulk publish completed for workspace ${job.data.workspaceId}: ${job.data.items.length} items`,
        ),
      );
      this.worker.on('failed', (job, err) =>
        this.logger.error(
          `Bulk publish failed for workspace ${job?.data.workspaceId}: ${err.message}`,
        ),
      );
      this.logger.log('Bulk Publish worker initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Bulk Publish worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.worker = null;
    }
  }

  private async process(payload: BulkPublishJobPayload): Promise<void> {
    const { workspaceId, items, triggeredBy } = payload;

    this.logger.log(
      `Processing bulk publish for workspace ${workspaceId}: ${items.length} items`,
    );

    for (const item of items) {
      try {
        const existing = await this.repository.findByListingAndMarketplace(
          item.listingId,
          item.marketplace,
          workspaceId,
        );

        if (
          existing &&
          (existing['status'] === PublicationStatus.PUBLISHING ||
            existing['status'] === PublicationStatus.PUBLISHED)
        ) {
          this.logger.warn(
            `Skipping bulk publish for listing ${item.listingId} on ${item.marketplace}: already ${existing['status']}`,
          );
          continue;
        }

        const marketplaceAccountId = await this.accountResolver.resolve(
          workspaceId,
          item.marketplace,
        );

        const version = await this.repository.getNextVersion(
          item.listingId,
          item.marketplace,
          workspaceId,
        );

        const record = await this.repository.create({
          workspaceId,
          listingId: item.listingId,
          catalogProductId: item.catalogProductId,
          marketplace: item.marketplace,
          status: PublicationStatus.PENDING,
          publicationVersion: version,
          marketplaceAccountId,
          marketplaceListingId: null,
          marketplaceUrl: null,
          marketplaceResponse: null,
          trigger: PublishTrigger.BULK,
          scheduledAt: item.scheduledAt ?? null,
          publishedAt: null,
          unpublishedAt: null,
          syncStatus: SyncStatus.UNKNOWN,
          lastSyncedAt: null,
          errorCode: null,
          errorMessage: null,
          failedAt: null,
          retryCount: 0,
        });

        const delay = item.scheduledAt
          ? Math.max(0, new Date(item.scheduledAt).getTime() - Date.now())
          : undefined;

        await this.publishQueue.enqueue(
          {
            publicationId: record['id'] as string,
            listingId: item.listingId,
            catalogProductId: item.catalogProductId,
            workspaceId,
            marketplace: item.marketplace,
            marketplaceAccountId,
            trigger: PublishTrigger.BULK,
            triggeredBy,
            retryCount: 0,
          },
          delay,
        );
      } catch (error) {
        this.logger.error(
          `Bulk publish item failed for listing ${item.listingId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }
}
