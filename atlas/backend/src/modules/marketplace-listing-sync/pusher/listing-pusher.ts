import { Injectable, Logger } from '@nestjs/common';
import {
  IListingSyncJob,
  ListingItemSyncResult,
  ListingItemType,
  ListingSyncAdapter,
  ListingSyncEvent,
  SyncItemOperation,
  SyncItemStatus,
  SyncJobStatus,
} from '../interfaces';
import { ListingSyncRepository } from '../repository/listing-sync.repository';
import { ListingSyncStateManager } from '../state/listing-sync-state.manager';
import { ListingSyncEventQueue } from '../events/listing-sync-events.queue';
import { ListingMapper } from '../mapper/listing-mapper';
import { MP_LISTING_SYNC_CONSTANTS, MP_LISTING_SYNC_ERROR_CODES } from '../constants';

export interface AtlasListingPage {
  items: AtlasListingItem[];
  nextCursor?: string | null;
  totalCount?: number | null;
}

export interface AtlasListingItem {
  internalId: string;
  externalId?: string | null;
  sku?: string | null;
  itemType: ListingItemType;
  title?: string | null;
  description?: string | null;
  bulletPoints?: string[];
  category?: string | null;
  attributes?: Record<string, unknown>;
  variants?: unknown[];
  media?: unknown[];
  price?: number | null;
  currency?: string | null;
  status?: string | null;
  updatedAt?: Date | null;
}

@Injectable()
export class ListingPusher {
  private readonly logger = new Logger(ListingPusher.name);

  constructor(
    private readonly repository: ListingSyncRepository,
    private readonly stateManager: ListingSyncStateManager,
    private readonly eventQueue: ListingSyncEventQueue,
    private readonly mapper: ListingMapper,
  ) {}

  async run(
    job: IListingSyncJob,
    adapter: ListingSyncAdapter,
    atlasFetcher: (opts: {
      workspaceId: string;
      accountId: string;
      itemType: ListingItemType;
      cursor?: string | null;
      filterOptions?: Record<string, unknown> | null;
      pageSize: number;
    }) => Promise<AtlasListingPage>,
  ): Promise<void> {
    if (!adapter.pushListingItem) {
      this.logger.warn(`Adapter '${job.providerKey}' does not support pushListingItem — skipping outbound`);
      return;
    }

    let cursor: string | null | undefined = job.cursor ?? null;
    let page = 0;
    let itemBatch: Record<string, unknown>[] = [];

    while (page < MP_LISTING_SYNC_CONSTANTS.MAX_PAGES_PER_JOB) {
      if (this.stateManager.isCancelled(job.id)) {
        await this.repository.updateJob(job.id, job.workspaceId, { status: SyncJobStatus.CANCELLED, cursor });
        await this.eventQueue.enqueue({
          event: ListingSyncEvent.CANCELLED,
          jobId: job.id, correlationId: job.correlationId, workspaceId: job.workspaceId,
          accountId: job.accountId, providerKey: job.providerKey, marketplaceKey: job.marketplaceKey,
          direction: job.direction, scope: job.scope, itemType: job.itemType,
          timestamp: new Date(),
        });
        return;
      }

      const pageResult = await atlasFetcher({
        workspaceId: job.workspaceId,
        accountId: job.accountId,
        itemType: job.itemType,
        cursor,
        filterOptions: job.filterOptions,
        pageSize: MP_LISTING_SYNC_CONSTANTS.ITEMS_PER_PAGE,
      });

      if (!pageResult.items?.length) break;

      if (page === 0 && pageResult.totalCount != null) {
        await this.repository.updateJob(job.id, job.workspaceId, { totalItems: pageResult.totalCount });
      }

      const counters = { processedItems: 0, createdItems: 0, updatedItems: 0, failedItems: 0, skippedItems: 0 };

      for (const atlasItem of pageResult.items) {
        const start = Date.now();
        const result = await this.pushItem(job, adapter, atlasItem);
        const processingMs = Date.now() - start;

        itemBatch.push({
          jobId: job.id, workspaceId: job.workspaceId,
          externalId: result.externalId ?? null, internalId: atlasItem.internalId, sku: atlasItem.sku ?? null,
          itemType: atlasItem.itemType, operation: result.operation, status: result.status,
          errorCode: result.errorCode ?? null, errorMessage: result.errorMessage ?? null,
          retryable: result.retryable, processingMs,
        });

        counters.processedItems++;
        if (result.status === SyncItemStatus.SYNCED) {
          if (result.operation === SyncItemOperation.CREATE) counters.createdItems++;
          else if (result.operation === SyncItemOperation.UPDATE) counters.updatedItems++;
        }
        else if (result.status === SyncItemStatus.FAILED) counters.failedItems++;
        else counters.skippedItems++;

        if (itemBatch.length >= MP_LISTING_SYNC_CONSTANTS.ITEM_RESULT_FLUSH_SIZE) {
          await this.repository.bulkCreateItemResults([...itemBatch]);
          itemBatch = [];
        }
      }

      await this.repository.incrementJobCounters(job.id, counters);

      cursor = pageResult.nextCursor ?? null;
      if (!cursor) break;
      page++;
    }

    if (itemBatch.length > 0) {
      await this.repository.bulkCreateItemResults(itemBatch);
    }
  }

  private async pushItem(job: IListingSyncJob, adapter: ListingSyncAdapter, atlasItem: AtlasListingItem): Promise<ListingItemSyncResult> {
    if (!adapter.pushListingItem) {
      return {
        externalId: null, internalId: atlasItem.internalId, sku: atlasItem.sku ?? null,
        itemType: atlasItem.itemType, operation: SyncItemOperation.NOOP, status: SyncItemStatus.SKIPPED, retryable: false,
      };
    }

    try {
      const mapped = this.mapper.normalizeOutbound(
        {
          sku: atlasItem.sku, title: atlasItem.title, description: atlasItem.description,
          bulletPoints: atlasItem.bulletPoints, category: atlasItem.category,
          attributes: atlasItem.attributes, variants: atlasItem.variants, media: atlasItem.media,
          price: atlasItem.price, currency: atlasItem.currency, status: atlasItem.status,
        },
        atlasItem.externalId ?? atlasItem.sku ?? atlasItem.internalId,
        job.providerKey,
        job.marketplaceKey,
      );

      const result = await adapter.pushListingItem({
        providerKey: job.providerKey,
        accountId: job.accountId,
        item: mapped,
      });

      if (result.success) {
        return {
          externalId: result.externalId, internalId: atlasItem.internalId, sku: atlasItem.sku ?? null,
          itemType: atlasItem.itemType, operation: atlasItem.externalId ? SyncItemOperation.UPDATE : SyncItemOperation.CREATE,
          status: SyncItemStatus.SYNCED, retryable: false,
        };
      } else {
        return {
          externalId: result.externalId, internalId: atlasItem.internalId, sku: atlasItem.sku ?? null,
          itemType: atlasItem.itemType, operation: SyncItemOperation.NOOP, status: SyncItemStatus.FAILED,
          errorCode: MP_LISTING_SYNC_ERROR_CODES.PUSH_FAILED,
          errorMessage: result.errorMessage ?? 'Push failed', retryable: true,
        };
      }
    } catch (err) {
      return {
        externalId: null, internalId: atlasItem.internalId, sku: atlasItem.sku ?? null, itemType: atlasItem.itemType,
        operation: SyncItemOperation.NOOP, status: SyncItemStatus.FAILED,
        errorCode: MP_LISTING_SYNC_ERROR_CODES.ADAPTER_ERROR,
        errorMessage: (err as Error).message, retryable: true,
      };
    }
  }
}
