import { Injectable, Logger } from '@nestjs/common';
import {
  ExportItemResult,
  ICatalogSyncJob,
  SyncItemOperation,
  SyncItemStatus,
  SyncItemType,
} from '../interfaces';
import { CatalogSyncRepository } from '../repository/catalog-sync.repository';
import { CatalogSyncStateManager } from '../state/catalog-sync-state.manager';
import { CatalogSyncEventQueue } from '../events/catalog-sync-events.queue';
import { CatalogMapper } from '../mapper/catalog-mapper';
import { MP_CATALOG_SYNC_CONSTANTS, MP_CATALOG_SYNC_ERROR_CODES } from '../constants';
import { CatalogSyncEvent, SyncJobStatus } from '../interfaces';

export interface AtlasCatalogPage {
  items: AtlasCatalogItem[];
  nextCursor?: string | null;
  totalCount?: number | null;
}

export interface AtlasCatalogItem {
  internalId: string;
  sku?: string | null;
  itemType: SyncItemType;
  data: Record<string, unknown>;
  updatedAt?: Date | null;
}

@Injectable()
export class CatalogExporter {
  private readonly logger = new Logger(CatalogExporter.name);

  constructor(
    private readonly repository: CatalogSyncRepository,
    private readonly stateManager: CatalogSyncStateManager,
    private readonly eventQueue: CatalogSyncEventQueue,
    private readonly mapper: CatalogMapper,
  ) {}

  /**
   * Executes outbound sync: pages through ATLAS catalog, maps to marketplace
   * format via mapper, pushes to marketplace via adapter.
   */
  async run(
    job: ICatalogSyncJob,
    adapter: {
      pushCatalogItem?: (opts: {
        providerKey: string;
        accountId: string;
        item: Record<string, unknown>;
      }) => Promise<{ externalId: string; success: boolean; errorMessage?: string | null }>;
    },
    atlasFetcher: (opts: {
      workspaceId: string;
      accountId: string;
      itemType: SyncItemType;
      cursor?: string | null;
      filterOptions?: Record<string, unknown> | null;
      pageSize: number;
    }) => Promise<AtlasCatalogPage>,
  ): Promise<void> {
    if (!adapter.pushCatalogItem) {
      this.logger.warn(
        `Adapter for '${job.providerKey}' does not implement pushCatalogItem — skipping outbound`,
      );
      return;
    }

    let cursor: string | null | undefined = job.cursor ?? null;
    let page = 0;
    let itemBatch: Record<string, unknown>[] = [];

    while (page < MP_CATALOG_SYNC_CONSTANTS.MAX_PAGES_PER_JOB) {
      if (this.stateManager.isCancelled(job.id)) {
        await this.repository.updateJob(job.id, job.workspaceId, {
          status: SyncJobStatus.CANCELLED,
          cursor,
        });
        await this.eventQueue.enqueue({
          event: CatalogSyncEvent.CANCELLED,
          jobId: job.id,
          correlationId: job.correlationId,
          workspaceId: job.workspaceId,
          accountId: job.accountId,
          providerKey: job.providerKey,
          marketplaceKey: job.marketplaceKey,
          direction: job.direction,
          scope: job.scope,
          itemType: job.itemType,
          timestamp: new Date(),
        });
        return;
      }

      const pageResult = await atlasFetcher({
        workspaceId: job.workspaceId,
        accountId: job.accountId,
        itemType: job.itemType,
        cursor,
        filterOptions: job.filterOptions as Record<string, unknown> | null,
        pageSize: MP_CATALOG_SYNC_CONSTANTS.ITEMS_PER_PAGE,
      });

      if (!pageResult.items?.length) break;

      if (page === 0 && pageResult.totalCount != null) {
        await this.repository.updateJob(job.id, job.workspaceId, {
          totalItems: pageResult.totalCount,
        });
      }

      const counters = {
        processedItems: 0,
        createdItems: 0,
        updatedItems: 0,
        failedItems: 0,
        skippedItems: 0,
      };

      for (const atlasItem of pageResult.items) {
        const start = Date.now();
        const result = await this.pushItem(job, atlasItem, adapter.pushCatalogItem!);
        const processingMs = Date.now() - start;

        itemBatch.push({
          jobId: job.id,
          workspaceId: job.workspaceId,
          externalId: result.externalId ?? atlasItem.internalId,
          internalId: atlasItem.internalId,
          itemType: result.itemType,
          operation: result.operation,
          status: result.status,
          errorCode: result.errorCode ?? null,
          errorMessage: result.errorMessage ?? null,
          retryable: result.retryable,
          processingMs,
        });

        counters.processedItems++;
        if (result.status === SyncItemStatus.SYNCED) {
          if (result.operation === SyncItemOperation.CREATE) counters.createdItems++;
          else counters.updatedItems++;
        } else if (result.status === SyncItemStatus.FAILED) {
          counters.failedItems++;
        } else {
          counters.skippedItems++;
        }

        if (itemBatch.length >= MP_CATALOG_SYNC_CONSTANTS.ITEM_RESULT_FLUSH_SIZE) {
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

  // ── Push single item ──────────────────────────────────────

  private async pushItem(
    job: ICatalogSyncJob,
    atlasItem: AtlasCatalogItem,
    push: (opts: {
      providerKey: string;
      accountId: string;
      item: Record<string, unknown>;
    }) => Promise<{ externalId: string; success: boolean; errorMessage?: string | null }>,
  ): Promise<ExportItemResult> {
    try {
      const mapped = this.mapper.normalizeOutbound(atlasItem.data, job.providerKey, job.marketplaceKey);

      // Check if we already have an external ref (UPDATE vs CREATE)
      const existingRef = await this.repository.findExternalRef(
        job.workspaceId,
        job.accountId,
        'PRODUCT',
        atlasItem.internalId,
      );
      const operation = existingRef ? SyncItemOperation.UPDATE : SyncItemOperation.CREATE;

      const response = await push({
        providerKey: job.providerKey,
        accountId: job.accountId,
        item: mapped,
      });

      if (!response.success) {
        return {
          internalId: atlasItem.internalId,
          externalId: null,
          itemType: atlasItem.itemType,
          operation,
          status: SyncItemStatus.FAILED,
          errorCode: MP_CATALOG_SYNC_ERROR_CODES.EXPORT_FAILED,
          errorMessage: this.sanitize(response.errorMessage ?? 'Push failed'),
          retryable: true,
        };
      }

      // Upsert external ref
      await this.repository.upsertExternalRef({
        workspaceId: job.workspaceId,
        accountId: job.accountId,
        providerKey: job.providerKey,
        marketplaceKey: job.marketplaceKey,
        refType: 'PRODUCT',
        externalId: response.externalId,
        internalId: atlasItem.internalId,
        internalSku: atlasItem.sku ?? null,
        internalType: atlasItem.itemType,
        status: 'ACTIVE',
        lastSyncedAt: new Date(),
        lastJobId: job.id,
      });

      return {
        internalId: atlasItem.internalId,
        externalId: response.externalId,
        itemType: atlasItem.itemType,
        operation,
        status: SyncItemStatus.SYNCED,
        retryable: false,
      };
    } catch (err) {
      return {
        internalId: atlasItem.internalId,
        externalId: null,
        itemType: atlasItem.itemType,
        operation: SyncItemOperation.NOOP,
        status: SyncItemStatus.FAILED,
        errorCode: MP_CATALOG_SYNC_ERROR_CODES.EXPORT_FAILED,
        errorMessage: this.sanitize((err as Error).message),
        retryable: true,
      };
    }
  }

  private sanitize(msg: string): string {
    return msg
      .replace(/(secret|token|password|key|credential)=[^\s&]*/gi, '$1=***')
      .substring(0, 500);
  }
}
