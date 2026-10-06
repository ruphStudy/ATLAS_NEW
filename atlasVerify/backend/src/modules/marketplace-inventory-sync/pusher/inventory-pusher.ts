import { Injectable, Logger } from '@nestjs/common';
import {
  IInventorySyncJob,
  InventoryItemSyncResult,
  InventoryItemType,
  InventorySyncAdapter,
  InventorySyncEvent,
  SyncItemOperation,
  SyncItemStatus,
  SyncJobStatus,
} from '../interfaces';
import { InventorySyncRepository } from '../repository/inventory-sync.repository';
import { InventorySyncStateManager } from '../state/inventory-sync-state.manager';
import { InventorySyncEventQueue } from '../events/inventory-sync-events.queue';
import { InventoryMapper } from '../mapper/inventory-mapper';
import { MP_INVENTORY_SYNC_CONSTANTS, MP_INVENTORY_SYNC_ERROR_CODES } from '../constants';

export interface AtlasInventoryPage {
  items: AtlasInventoryItem[];
  nextCursor?: string | null;
  totalCount?: number | null;
}

export interface AtlasInventoryItem {
  internalId: string;
  externalId?: string | null;
  sku?: string | null;
  warehouseId?: string | null;
  itemType: InventoryItemType;
  available: number;
  reserved: number;
  incoming: number;
  safetyStock: number;
  updatedAt?: Date | null;
}

@Injectable()
export class InventoryPusher {
  private readonly logger = new Logger(InventoryPusher.name);

  constructor(
    private readonly repository: InventorySyncRepository,
    private readonly stateManager: InventorySyncStateManager,
    private readonly eventQueue: InventorySyncEventQueue,
    private readonly mapper: InventoryMapper,
  ) {}

  /**
   * Executes outbound sync: pages through ATLAS inventory, maps and pushes
   * each item to the marketplace via adapter.
   */
  async run(
    job: IInventorySyncJob,
    adapter: InventorySyncAdapter,
    atlasFetcher: (opts: {
      workspaceId: string;
      accountId: string;
      warehouseId?: string | null;
      itemType: InventoryItemType;
      cursor?: string | null;
      filterOptions?: Record<string, unknown> | null;
      pageSize: number;
    }) => Promise<AtlasInventoryPage>,
  ): Promise<void> {
    if (!adapter.pushInventoryItem) {
      this.logger.warn(`Adapter '${job.providerKey}' does not support pushInventoryItem — skipping outbound`);
      return;
    }

    let cursor: string | null | undefined = job.cursor ?? null;
    let page = 0;
    let itemBatch: Record<string, unknown>[] = [];

    while (page < MP_INVENTORY_SYNC_CONSTANTS.MAX_PAGES_PER_JOB) {
      if (this.stateManager.isCancelled(job.id)) {
        await this.repository.updateJob(job.id, job.workspaceId, { status: SyncJobStatus.CANCELLED, cursor });
        await this.eventQueue.enqueue({
          event: InventorySyncEvent.CANCELLED,
          jobId: job.id, correlationId: job.correlationId, workspaceId: job.workspaceId,
          accountId: job.accountId, providerKey: job.providerKey, marketplaceKey: job.marketplaceKey,
          warehouseId: job.warehouseId, direction: job.direction, scope: job.scope, itemType: job.itemType,
          timestamp: new Date(),
        });
        return;
      }

      const pageResult = await atlasFetcher({
        workspaceId: job.workspaceId,
        accountId: job.accountId,
        warehouseId: job.warehouseId,
        itemType: job.itemType,
        cursor,
        filterOptions: job.filterOptions,
        pageSize: MP_INVENTORY_SYNC_CONSTANTS.ITEMS_PER_PAGE,
      });

      if (!pageResult.items?.length) break;

      if (page === 0 && pageResult.totalCount != null) {
        await this.repository.updateJob(job.id, job.workspaceId, { totalItems: pageResult.totalCount });
      }

      const counters = { processedItems: 0, pushedItems: 0, failedItems: 0, skippedItems: 0 };

      for (const atlasItem of pageResult.items) {
        const start = Date.now();
        const result = await this.pushItem(job, adapter, atlasItem);
        const processingMs = Date.now() - start;

        itemBatch.push({
          jobId: job.id, workspaceId: job.workspaceId, warehouseId: atlasItem.warehouseId ?? null,
          externalId: result.externalId ?? null, internalId: atlasItem.internalId, sku: atlasItem.sku ?? null,
          itemType: atlasItem.itemType, operation: result.operation, status: result.status,
          errorCode: result.errorCode ?? null, errorMessage: result.errorMessage ?? null,
          retryable: result.retryable, processingMs,
        });

        counters.processedItems++;
        if (result.status === SyncItemStatus.SYNCED) counters.pushedItems++;
        else if (result.status === SyncItemStatus.FAILED) counters.failedItems++;
        else counters.skippedItems++;

        if (itemBatch.length >= MP_INVENTORY_SYNC_CONSTANTS.ITEM_RESULT_FLUSH_SIZE) {
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

  private async pushItem(job: IInventorySyncJob, adapter: InventorySyncAdapter, atlasItem: AtlasInventoryItem): Promise<InventoryItemSyncResult> {
    if (!adapter.pushInventoryItem) {
      return {
        externalId: null, internalId: atlasItem.internalId, sku: atlasItem.sku ?? null,
        itemType: atlasItem.itemType, operation: SyncItemOperation.NOOP, status: SyncItemStatus.SKIPPED, retryable: false,
      };
    }

    try {
      const mapped = this.mapper.normalizeOutbound(
        {
          sku: atlasItem.sku, warehouseId: atlasItem.warehouseId,
          available: atlasItem.available, reserved: atlasItem.reserved,
          incoming: atlasItem.incoming, safetyStock: atlasItem.safetyStock,
        },
        atlasItem.externalId ?? atlasItem.sku ?? atlasItem.internalId,
        job.providerKey,
        job.marketplaceKey,
      );

      const result = await adapter.pushInventoryItem({
        providerKey: job.providerKey,
        accountId: job.accountId,
        warehouseId: atlasItem.warehouseId,
        item: mapped,
      });

      if (result.success) {
        return {
          externalId: result.externalId, internalId: atlasItem.internalId, sku: atlasItem.sku ?? null,
          itemType: atlasItem.itemType, operation: SyncItemOperation.UPDATE, status: SyncItemStatus.SYNCED, retryable: false,
        };
      } else {
        return {
          externalId: result.externalId, internalId: atlasItem.internalId, sku: atlasItem.sku ?? null,
          itemType: atlasItem.itemType, operation: SyncItemOperation.NOOP, status: SyncItemStatus.FAILED,
          errorCode: MP_INVENTORY_SYNC_ERROR_CODES.PUSH_FAILED,
          errorMessage: result.errorMessage ?? 'Push failed', retryable: true,
        };
      }
    } catch (err) {
      return {
        externalId: null, internalId: atlasItem.internalId, sku: atlasItem.sku ?? null, itemType: atlasItem.itemType,
        operation: SyncItemOperation.NOOP, status: SyncItemStatus.FAILED,
        errorCode: MP_INVENTORY_SYNC_ERROR_CODES.ADAPTER_ERROR,
        errorMessage: (err as Error).message, retryable: true,
      };
    }
  }
}
      }

      const counters = { processedItems: 0, pushedItems: 0, failedItems: 0, skippedItems: 0 };

      for (const atlasItem of pageResult.items) {
        const start = Date.now();
        const result = await this.pushItem(job, atlasItem, adapter.pushInventoryItem!);
        const processingMs = Date.now() - start;

        itemBatch.push({
          jobId: job.id,
          workspaceId: job.workspaceId,
          warehouseId: atlasItem.warehouseId ?? job.warehouseId ?? null,
          externalId: result.externalId ?? atlasItem.externalId,
          internalId: atlasItem.internalId,
          sku: atlasItem.sku ?? null,
          itemType: atlasItem.itemType,
          operation: result.operation,
          status: result.status,
          errorCode: result.errorCode ?? null,
          errorMessage: result.errorMessage ?? null,
          retryable: result.retryable,
          processingMs,
        });

        counters.processedItems++;
        if (result.status === SyncItemStatus.SYNCED) counters.pushedItems++;
        else if (result.status === SyncItemStatus.FAILED) counters.failedItems++;
        else counters.skippedItems++;

        if (itemBatch.length >= MP_INVENTORY_SYNC_CONSTANTS.ITEM_RESULT_FLUSH_SIZE) {
          await this.repository.bulkCreateItemResults([...itemBatch]);
          itemBatch = [];
        }
      }

      await this.repository.incrementJobCounters(job.id, counters);

      cursor = pageResult.nextCursor ?? null;
      if (!cursor) break;
      page++;
    }

    if (itemBatch.length > 0) await this.repository.bulkCreateItemResults(itemBatch);
  }

  private async pushItem(
    job: IInventorySyncJob,
    atlasItem: AtlasInventoryItem,
    push: NonNullable<InventorySyncAdapter['pushInventoryItem']>,
  ): Promise<InventoryItemSyncResult> {
    try {
      const existingRef = atlasItem.externalId
        ? await this.repository.findExternalRef(job.workspaceId, job.accountId, atlasItem.externalId)
        : await this.repository.findExternalRefByInternalId(job.workspaceId, job.accountId, atlasItem.internalId);

      const operation = existingRef ? SyncItemOperation.UPDATE : SyncItemOperation.CREATE;
      const externalId = atlasItem.externalId ?? (existingRef?.['externalId'] as string | undefined);

      const payload = this.mapper.normalizeOutbound(
        { ...atlasItem } as Record<string, unknown>,
        externalId ?? atlasItem.internalId,
        job.providerKey,
        job.marketplaceKey,
      );

      const response = await push({ providerKey: job.providerKey, accountId: job.accountId, warehouseId: atlasItem.warehouseId, item: payload });

      if (!response.success) {
        return {
          internalId: atlasItem.internalId,
          externalId: externalId ?? null,
          sku: atlasItem.sku,
          itemType: atlasItem.itemType,
          operation,
          status: SyncItemStatus.FAILED,
          errorCode: MP_INVENTORY_SYNC_ERROR_CODES.PUSH_FAILED,
          errorMessage: this.sanitize(response.errorMessage ?? 'Push failed'),
          retryable: true,
        };
      }

      await this.repository.upsertExternalRef({
        workspaceId: job.workspaceId,
        accountId: job.accountId,
        providerKey: job.providerKey,
        marketplaceKey: job.marketplaceKey,
        warehouseId: atlasItem.warehouseId,
        externalId: response.externalId,
        externalSku: atlasItem.sku,
        internalId: atlasItem.internalId,
        internalSku: atlasItem.sku,
        status: 'ACTIVE',
        available: atlasItem.available,
        reserved: atlasItem.reserved,
        incoming: atlasItem.incoming,
        safetyStock: atlasItem.safetyStock,
        lastSyncedAt: new Date(),
        lastJobId: job.id,
      });

      return {
        internalId: atlasItem.internalId,
        externalId: response.externalId,
        sku: atlasItem.sku,
        itemType: atlasItem.itemType,
        operation,
        status: SyncItemStatus.SYNCED,
        retryable: false,
      };
    } catch (err) {
      return {
        internalId: atlasItem.internalId,
        externalId: atlasItem.externalId ?? null,
        sku: atlasItem.sku,
        itemType: atlasItem.itemType,
        operation: SyncItemOperation.NOOP,
        status: SyncItemStatus.FAILED,
        errorCode: MP_INVENTORY_SYNC_ERROR_CODES.PUSH_FAILED,
        errorMessage: this.sanitize((err as Error).message),
        retryable: true,
      };
    }
  }

  private sanitize(msg: string): string {
    return msg.replace(/(secret|token|password|key|credential)=[^\s&]*/gi, '$1=***').substring(0, 500);
  }
}
