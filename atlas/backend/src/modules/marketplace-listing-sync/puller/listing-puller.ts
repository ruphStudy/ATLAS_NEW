import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  ConflictStrategy,
  ExternalListingRefStatus,
  IListingSyncJob,
  ListingAdapterItem,
  ListingConflictType,
  ListingItemSyncResult,
  ListingItemType,
  ListingSyncAdapter,
  ListingSyncEvent,
  NormalizedListingItem,
  SyncItemOperation,
  SyncItemStatus,
  SyncJobStatus,
} from '../interfaces';
import { ListingSyncRepository } from '../repository/listing-sync.repository';
import { ListingSyncStateManager } from '../state/listing-sync-state.manager';
import { ListingSyncEventQueue } from '../events/listing-sync-events.queue';
import { ListingMapper } from '../mapper/listing-mapper';
import { ListingSyncConflictResolver } from '../conflict/listing-sync-conflict.resolver';
import { MP_LISTING_SYNC_CONSTANTS, MP_LISTING_SYNC_ERROR_CODES } from '../constants';

export { ExternalListingRefStatus };

@Injectable()
export class ListingPuller {
  private readonly logger = new Logger(ListingPuller.name);

  constructor(
    private readonly repository: ListingSyncRepository,
    private readonly stateManager: ListingSyncStateManager,
    private readonly eventQueue: ListingSyncEventQueue,
    private readonly mapper: ListingMapper,
    private readonly conflictResolver: ListingSyncConflictResolver,
  ) {}

  async run(job: IListingSyncJob, adapter: ListingSyncAdapter): Promise<void> {
    let cursor: string | null | undefined = job.cursor ?? null;
    let page = 0;
    let itemBatch: Record<string, unknown>[] = [];

    while (page < MP_LISTING_SYNC_CONSTANTS.MAX_PAGES_PER_JOB) {
      if (this.stateManager.isCancelled(job.id)) {
        await this.cancel(job, cursor);
        return;
      }

      const pageResult = await adapter.fetchListingPage({
        providerKey: job.providerKey,
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
      if (pageResult.nextCursor) {
        await this.repository.updateJob(job.id, job.workspaceId, { cursor: pageResult.nextCursor });
      }

      const counters = { processedItems: 0, createdItems: 0, updatedItems: 0, failedItems: 0, conflictItems: 0, skippedItems: 0 };

      for (const adapterItem of pageResult.items) {
        const start = Date.now();
        const result = await this.processItem(job, adapterItem);
        const processingMs = Date.now() - start;

        itemBatch.push({
          jobId: job.id,
          workspaceId: job.workspaceId,
          externalId: result.externalId,
          internalId: result.internalId ?? null,
          sku: result.sku ?? null,
          itemType: result.itemType,
          operation: result.operation,
          status: result.status,
          conflictType: result.conflictType ?? null,
          conflictResolution: result.conflictResolution ?? null,
          errorCode: result.errorCode ?? null,
          errorMessage: result.errorMessage ?? null,
          retryable: result.retryable,
          processingMs,
        });

        counters.processedItems++;
        if (result.status === SyncItemStatus.SYNCED) {
          if (result.operation === SyncItemOperation.CREATE) counters.createdItems++;
          else if (result.operation === SyncItemOperation.UPDATE) counters.updatedItems++;
        } else if (result.status === SyncItemStatus.FAILED) {
          counters.failedItems++;
        } else if (result.status === SyncItemStatus.CONFLICT) {
          counters.conflictItems++;
        } else {
          counters.skippedItems++;
        }

        if (itemBatch.length >= MP_LISTING_SYNC_CONSTANTS.ITEM_RESULT_FLUSH_SIZE) {
          await this.repository.bulkCreateItemResults([...itemBatch]);
          itemBatch = [];
        }
      }

      await this.repository.incrementJobCounters(job.id, counters);
      const fresh = await this.repository.findJobById(job.id, job.workspaceId);
      const processed = (fresh?.['processedItems'] as number) ?? 0;

      if (processed % MP_LISTING_SYNC_CONSTANTS.PROGRESS_EMIT_EVERY === 0) {
        await this.eventQueue.enqueue({
          event: ListingSyncEvent.PROGRESS,
          jobId: job.id, correlationId: job.correlationId, workspaceId: job.workspaceId,
          accountId: job.accountId, providerKey: job.providerKey, marketplaceKey: job.marketplaceKey,
          direction: job.direction, scope: job.scope, itemType: job.itemType,
          processedItems: processed, totalItems: fresh?.['totalItems'] as number,
          failedItems: fresh?.['failedItems'] as number,
          timestamp: new Date(),
        });
      }

      cursor = pageResult.nextCursor ?? null;
      if (!cursor) break;
      page++;
    }

    if (itemBatch.length > 0) {
      await this.repository.bulkCreateItemResults(itemBatch);
    }
  }

  private async processItem(job: IListingSyncJob, adapterItem: ListingAdapterItem): Promise<ListingItemSyncResult> {
    try {
      const normalized = this.mapper.normalizeInbound(adapterItem, job.providerKey, job.marketplaceKey);
      const existingRef = await this.repository.findExternalRef(job.workspaceId, job.accountId, normalized.externalId);

      const conflictType = await this.conflictResolver.detect(normalized, existingRef, job);
      if (conflictType) {
        const resolution = this.conflictResolver.resolveStrategy(
          conflictType,
          job.conflictStrategy ?? null,
          normalized,
          existingRef,
        );

        if (resolution === 'FLAG' || resolution === 'SKIP') {
          await this.conflictResolver.persistConflict(job, normalized, conflictType, resolution, existingRef);
          return {
            externalId: normalized.externalId, internalId: existingRef?.['internalId'] as string ?? null,
            sku: normalized.externalSku, itemType: normalized.itemType, operation: SyncItemOperation.NOOP,
            status: resolution === 'FLAG' ? SyncItemStatus.CONFLICT : SyncItemStatus.SKIPPED,
            conflictType, conflictResolution: resolution, retryable: false,
          };
        }
      }

      const checksum = this.checksum(normalized);
      const ref = await this.repository.upsertExternalRef({
        workspaceId: job.workspaceId, accountId: job.accountId, providerKey: job.providerKey, marketplaceKey: job.marketplaceKey,
        externalId: normalized.externalId, externalSku: normalized.externalSku,
        externalTitle: normalized.title,
        internalId: existingRef?.['internalId'] as string ?? null,
        internalSku: existingRef?.['internalSku'] as string ?? null,
        status: ExternalListingRefStatus.ACTIVE, listingStatus: normalized.status ?? null,
        lastSyncedAt: new Date(), lastJobId: job.id, checksum,
      });

      return {
        externalId: normalized.externalId, internalId: ref['internalId'] as string ?? null,
        sku: normalized.externalSku, itemType: normalized.itemType,
        operation: existingRef ? SyncItemOperation.UPDATE : SyncItemOperation.CREATE,
        status: SyncItemStatus.SYNCED, retryable: false,
      };
    } catch (err) {
      return {
        externalId: adapterItem.externalId, internalId: null, sku: null, itemType: ListingItemType.LISTING,
        operation: SyncItemOperation.NOOP, status: SyncItemStatus.FAILED,
        errorCode: MP_LISTING_SYNC_ERROR_CODES.ADAPTER_ERROR, errorMessage: (err as Error).message, retryable: true,
      };
    }
  }

  private async cancel(job: IListingSyncJob, cursor: string | null | undefined): Promise<void> {
    await this.repository.updateJob(job.id, job.workspaceId, { status: SyncJobStatus.CANCELLED, cursor: cursor ?? null });
    await this.eventQueue.enqueue({
      event: ListingSyncEvent.CANCELLED,
      jobId: job.id, correlationId: job.correlationId, workspaceId: job.workspaceId,
      accountId: job.accountId, providerKey: job.providerKey, marketplaceKey: job.marketplaceKey,
      direction: job.direction, scope: job.scope, itemType: job.itemType,
      timestamp: new Date(),
    });
  }

  private checksum(item: NormalizedListingItem): string {
    const data = `${item.title}|${item.price}|${item.status}|${item.externalSku}`;
    return crypto.createHash(MP_LISTING_SYNC_CONSTANTS.CHECKSUM_ALGO).update(data).digest('hex').substring(0, 16);
  }
}
