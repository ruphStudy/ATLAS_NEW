import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  ConflictStrategy,
  ExternalRefStatus,
  IInventorySyncJob,
  InventoryAdapterItem,
  InventoryConflictType,
  InventoryItemSyncResult,
  InventoryItemType,
  InventorySyncAdapter,
  InventorySyncEvent,
  SyncDirection,
  SyncItemOperation,
  SyncItemStatus,
  SyncJobStatus,
} from '../interfaces';
import { InventorySyncRepository } from '../repository/inventory-sync.repository';
import { InventorySyncStateManager } from '../state/inventory-sync-state.manager';
import { InventorySyncEventQueue } from '../events/inventory-sync-events.queue';
import { InventoryMapper } from '../mapper/inventory-mapper';
import { InventorySyncConflictResolver } from '../conflict/inventory-sync-conflict.resolver';
import { MP_INVENTORY_SYNC_CONSTANTS, MP_INVENTORY_SYNC_ERROR_CODES } from '../constants';

// Re-export ExternalRefStatus for use in puller
export { ExternalRefStatus };

@Injectable()
export class InventoryPuller {
  private readonly logger = new Logger(InventoryPuller.name);

  constructor(
    private readonly repository: InventorySyncRepository,
    private readonly stateManager: InventorySyncStateManager,
    private readonly eventQueue: InventorySyncEventQueue,
    private readonly mapper: InventoryMapper,
    private readonly conflictResolver: InventorySyncConflictResolver,
  ) {}

  /**
   * Executes inbound sync: pages through marketplace inventory via adapter,
   * normalizes, detects conflicts, upserts ExternalRef.
   */
  async run(job: IInventorySyncJob, adapter: InventorySyncAdapter): Promise<void> {
    let cursor: string | null | undefined = job.cursor ?? null;
    let page = 0;
    let itemBatch: Record<string, unknown>[] = [];

    while (page < MP_INVENTORY_SYNC_CONSTANTS.MAX_PAGES_PER_JOB) {
      if (this.stateManager.isCancelled(job.id)) {
        await this.cancel(job, cursor);
        return;
      }

      const pageResult = await adapter.fetchInventoryPage({
        providerKey: job.providerKey,
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
      if (pageResult.nextCursor) {
        await this.repository.updateJob(job.id, job.workspaceId, { cursor: pageResult.nextCursor });
      }

      const counters = { processedItems: 0, pulledItems: 0, failedItems: 0, conflictItems: 0, skippedItems: 0 };

      for (const adapterItem of pageResult.items) {
        const start = Date.now();
        const result = await this.processItem(job, adapterItem);
        const processingMs = Date.now() - start;

        itemBatch.push({
          jobId: job.id,
          workspaceId: job.workspaceId,
          warehouseId: job.warehouseId ?? null,
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
        if (result.status === SyncItemStatus.SYNCED) counters.pulledItems++;
        else if (result.status === SyncItemStatus.FAILED) counters.failedItems++;
        else if (result.status === SyncItemStatus.CONFLICT) counters.conflictItems++;
        else counters.skippedItems++;

        if (itemBatch.length >= MP_INVENTORY_SYNC_CONSTANTS.ITEM_RESULT_FLUSH_SIZE) {
          await this.repository.bulkCreateItemResults([...itemBatch]);
          itemBatch = [];
        }
      }

      await this.repository.incrementJobCounters(job.id, counters);
      const fresh = await this.repository.findJobById(job.id, job.workspaceId);
      const processed = (fresh?.['processedItems'] as number) ?? 0;

      if (processed % MP_INVENTORY_SYNC_CONSTANTS.PROGRESS_EMIT_EVERY === 0) {
        await this.eventQueue.enqueue({
          event: InventorySyncEvent.PROGRESS,
          jobId: job.id, correlationId: job.correlationId, workspaceId: job.workspaceId,
          accountId: job.accountId, providerKey: job.providerKey, marketplaceKey: job.marketplaceKey,
          warehouseId: job.warehouseId, direction: job.direction, scope: job.scope, itemType: job.itemType,
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

  private async processItem(job: IInventorySyncJob, adapterItem: InventoryAdapterItem): Promise<InventoryItemSyncResult> {
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
        warehouseId: normalized.warehouseId ?? job.warehouseId ?? null,
        externalId: normalized.externalId, externalSku: normalized.externalSku,
        internalId: existingRef?.['internalId'] as string ?? null,
        internalSku: existingRef?.['internalSku'] as string ?? null,
        status: ExternalRefStatus.ACTIVE, available: normalized.available, reserved: normalized.reserved,
        incoming: normalized.incoming, safetyStock: normalized.safetyStock,
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
        externalId: adapterItem.externalId, internalId: null, sku: null, itemType: InventoryItemType.AVAILABLE,
        operation: SyncItemOperation.NOOP, status: SyncItemStatus.FAILED,
        errorCode: MP_INVENTORY_SYNC_ERROR_CODES.ADAPTER_ERROR, errorMessage: (err as Error).message, retryable: true,
      };
    }
  }

  private async cancel(job: IInventorySyncJob, cursor: string | null | undefined): Promise<void> {
    await this.repository.updateJob(job.id, job.workspaceId, { status: SyncJobStatus.CANCELLED, cursor: cursor ?? null });
    await this.eventQueue.enqueue({
      event: InventorySyncEvent.CANCELLED,
      jobId: job.id, correlationId: job.correlationId, workspaceId: job.workspaceId,
      accountId: job.accountId, providerKey: job.providerKey, marketplaceKey: job.marketplaceKey,
      warehouseId: job.warehouseId, direction: job.direction, scope: job.scope, itemType: job.itemType,
      timestamp: new Date(),
    });
  }

  private checksum(item: NormalizedInventoryItem): string {
    const data = `${item.available}|${item.reserved}|${item.incoming}|${item.safetyStock}`;
    return crypto.createHash(MP_INVENTORY_SYNC_CONSTANTS.CHECKSUM_ALGO).update(data).digest('hex').substring(0, 16);
  }
}
        else if (result.status === SyncItemStatus.FAILED) counters.failedItems++;
        else if (result.status === SyncItemStatus.CONFLICT) counters.conflictItems++;
        else counters.skippedItems++;

        if (itemBatch.length >= MP_INVENTORY_SYNC_CONSTANTS.ITEM_RESULT_FLUSH_SIZE) {
          await this.repository.bulkCreateItemResults([...itemBatch]);
          itemBatch = [];
        }
      }

      await this.repository.incrementJobCounters(job.id, counters);
      this.emitProgress(job, counters.processedItems);

      cursor = pageResult.nextCursor ?? null;
      if (!cursor) break;
      page++;
    }

    if (itemBatch.length > 0) await this.repository.bulkCreateItemResults(itemBatch);
  }

  private async processItem(job: IInventorySyncJob, adapterItem: InventoryAdapterItem): Promise<InventoryItemSyncResult> {
    try {
      const normalized = this.mapper.normalizeInbound(adapterItem, job.providerKey, job.marketplaceKey);
      const existingRef = await this.repository.findExternalRef(job.workspaceId, job.accountId, adapterItem.externalId);

      const conflictType = await this.conflictResolver.detect(normalized, existingRef, job);
      if (conflictType) {
        const resolution = this.conflictResolver.resolveStrategy(conflictType, job.conflictStrategy ?? null, normalized, existingRef);
        await this.conflictResolver.persistConflict(job, normalized, conflictType, resolution, existingRef);

        if (resolution === 'SKIP') {
          return { externalId: adapterItem.externalId, sku: normalized.externalSku, itemType: normalized.itemType, operation: SyncItemOperation.NOOP, status: SyncItemStatus.SKIPPED, conflictType, conflictResolution: 'SKIP', retryable: false };
        }
        if (resolution === 'FLAG') {
          return { externalId: adapterItem.externalId, sku: normalized.externalSku, itemType: normalized.itemType, operation: SyncItemOperation.NOOP, status: SyncItemStatus.CONFLICT, conflictType, conflictResolution: 'FLAG', retryable: false };
        }
      }

      const operation = existingRef ? SyncItemOperation.UPDATE : SyncItemOperation.CREATE;
      const checksum = crypto.createHash('sha256').update(JSON.stringify(normalized.raw)).digest('hex').substring(0, 16);

      await this.repository.upsertExternalRef({
        workspaceId: job.workspaceId,
        accountId: job.accountId,
        providerKey: job.providerKey,
        marketplaceKey: job.marketplaceKey,
        warehouseId: normalized.warehouseId ?? job.warehouseId,
        externalId: adapterItem.externalId,
        externalSku: normalized.externalSku,
        internalId: (existingRef?.['internalId'] as string | undefined) ?? null,
        status: 'ACTIVE',
        available: normalized.available,
        reserved: normalized.reserved,
        incoming: normalized.incoming,
        safetyStock: normalized.safetyStock,
        lastSyncedAt: new Date(),
        lastJobId: job.id,
        checksum,
      });

      return {
        externalId: adapterItem.externalId,
        sku: normalized.externalSku,
        itemType: normalized.itemType,
        operation,
        status: SyncItemStatus.SYNCED,
        retryable: false,
      };
    } catch (err) {
      return {
        externalId: adapterItem.externalId,
        itemType: InventoryItemType.ALL,
        operation: SyncItemOperation.NOOP,
        status: SyncItemStatus.FAILED,
        errorCode: MP_INVENTORY_SYNC_ERROR_CODES.ADAPTER_ERROR,
        errorMessage: this.sanitize((err as Error).message),
        retryable: true,
      };
    }
  }

  private async cancel(job: IInventorySyncJob, cursor?: string | null): Promise<void> {
    await this.repository.updateJob(job.id, job.workspaceId, { status: SyncJobStatus.CANCELLED, cursor });
    await this.eventQueue.enqueue({
      event: InventorySyncEvent.CANCELLED,
      jobId: job.id, correlationId: job.correlationId, workspaceId: job.workspaceId,
      accountId: job.accountId, providerKey: job.providerKey, marketplaceKey: job.marketplaceKey,
      warehouseId: job.warehouseId, direction: job.direction, scope: job.scope, itemType: job.itemType,
      timestamp: new Date(),
    });
  }

  private emitProgress(job: IInventorySyncJob, delta: number): void {
    if (delta % MP_INVENTORY_SYNC_CONSTANTS.PROGRESS_EMIT_EVERY === 0) {
      this.eventQueue.enqueue({
        event: InventorySyncEvent.PROGRESS,
        jobId: job.id, correlationId: job.correlationId, workspaceId: job.workspaceId,
        accountId: job.accountId, providerKey: job.providerKey, marketplaceKey: job.marketplaceKey,
        warehouseId: job.warehouseId, direction: job.direction, scope: job.scope, itemType: job.itemType,
        timestamp: new Date(),
      });
    }
  }

  private sanitize(msg: string): string {
    return msg.replace(/(secret|token|password|key|credential)=[^\s&]*/gi, '$1=***').substring(0, 500);
  }
}
