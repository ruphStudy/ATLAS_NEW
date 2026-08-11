import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  ConflictStrategy,
  ExternalRefStatus,
  ExternalRefType,
  ICatalogSyncJob,
  ImportItemResult,
  NormalizedCatalogItem,
  SyncAdapterItem,
  SyncConflictType,
  SyncDirection,
  SyncItemOperation,
  SyncItemStatus,
  SyncItemType,
  SyncJobStatus,
} from '../interfaces';
import { CatalogSyncRepository } from '../repository/catalog-sync.repository';
import { CatalogSyncStateManager } from '../state/catalog-sync-state.manager';
import { CatalogSyncEventQueue } from '../events/catalog-sync-events.queue';
import { CatalogMapper } from '../mapper/catalog-mapper';
import { CatalogSyncConflictResolver } from '../conflict/catalog-sync-conflict.resolver';
import { MP_CATALOG_SYNC_CONSTANTS, MP_CATALOG_SYNC_ERROR_CODES } from '../constants';
import { CatalogSyncEvent } from '../interfaces';

@Injectable()
export class CatalogImporter {
  private readonly logger = new Logger(CatalogImporter.name);

  constructor(
    private readonly repository: CatalogSyncRepository,
    private readonly stateManager: CatalogSyncStateManager,
    private readonly eventQueue: CatalogSyncEventQueue,
    private readonly mapper: CatalogMapper,
    private readonly conflictResolver: CatalogSyncConflictResolver,
  ) {}

  /**
   * Executes an inbound sync: pages through marketplace catalog via adapter,
   * normalizes each item, detects/resolves conflicts, persists to ATLAS.
   */
  async run(
    job: ICatalogSyncJob,
    adapter: {
      fetchCatalogPage: (opts: {
        providerKey: string;
        accountId: string;
        itemType: SyncItemType;
        cursor?: string | null;
        filterOptions?: Record<string, unknown> | null;
        pageSize: number;
      }) => Promise<{
        items: SyncAdapterItem[];
        nextCursor?: string | null;
        totalCount?: number | null;
      }>;
    },
  ): Promise<void> {
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

      const pageResult = await adapter.fetchCatalogPage({
        providerKey: job.providerKey,
        accountId: job.accountId,
        itemType: job.itemType,
        cursor,
        filterOptions: job.filterOptions as Record<string, unknown> | null,
        pageSize: MP_CATALOG_SYNC_CONSTANTS.ITEMS_PER_PAGE,
      });

      if (!pageResult.items?.length) break;

      // Update totalItems from first page
      if (page === 0 && pageResult.totalCount != null) {
        await this.repository.updateJob(job.id, job.workspaceId, {
          totalItems: pageResult.totalCount,
        });
      }

      // Persist cursor checkpoint after each page
      if (pageResult.nextCursor) {
        await this.repository.updateJob(job.id, job.workspaceId, {
          cursor: pageResult.nextCursor,
        });
      }

      const counters = {
        processedItems: 0,
        createdItems: 0,
        updatedItems: 0,
        failedItems: 0,
        conflictItems: 0,
        skippedItems: 0,
      };

      for (const adapterItem of pageResult.items) {
        const start = Date.now();
        const result = await this.processItem(job, adapterItem);
        const processingMs = Date.now() - start;

        itemBatch.push({
          jobId: job.id,
          workspaceId: job.workspaceId,
          externalId: result.externalId,
          internalId: result.internalId ?? null,
          itemType: result.itemType,
          operation: result.operation,
          status: result.status,
          conflictType: result.conflictType ?? null,
          conflictResolution: result.conflictResolution ?? null,
          errorCode: result.errorCode ?? null,
          errorMessage: result.errorMessage ?? null,
          retryable: result.retryable,
          processingMs,
          snapshot: adapterItem.data ? this.safeSnapshot(adapterItem.data) : null,
        });

        counters.processedItems++;
        switch (result.status) {
          case SyncItemStatus.SYNCED:
            if (result.operation === SyncItemOperation.CREATE) counters.createdItems++;
            else if (result.operation === SyncItemOperation.UPDATE) counters.updatedItems++;
            break;
          case SyncItemStatus.FAILED:
            counters.failedItems++;
            break;
          case SyncItemStatus.CONFLICT:
            counters.conflictItems++;
            break;
          case SyncItemStatus.SKIPPED:
            counters.skippedItems++;
            break;
        }

        if (itemBatch.length >= MP_CATALOG_SYNC_CONSTANTS.ITEM_RESULT_FLUSH_SIZE) {
          await this.repository.bulkCreateItemResults([...itemBatch]);
          itemBatch = [];
        }
      }

      await this.repository.incrementJobCounters(job.id, counters);

      const fresh = await this.repository.findJobById(job.id, job.workspaceId);
      const processed = (fresh?.['processedItems'] as number) ?? 0;
      if (processed % MP_CATALOG_SYNC_CONSTANTS.PROGRESS_EMIT_EVERY === 0) {
        await this.eventQueue.enqueue({
          event: CatalogSyncEvent.PROGRESS,
          jobId: job.id,
          correlationId: job.correlationId,
          workspaceId: job.workspaceId,
          accountId: job.accountId,
          providerKey: job.providerKey,
          marketplaceKey: job.marketplaceKey,
          direction: job.direction,
          scope: job.scope,
          itemType: job.itemType,
          processedItems: processed,
          totalItems: (fresh?.['totalItems'] as number) ?? 0,
          timestamp: new Date(),
        });
      }

      cursor = pageResult.nextCursor ?? null;
      if (!cursor) break;
      page++;
    }

    // Flush remainder
    if (itemBatch.length > 0) {
      await this.repository.bulkCreateItemResults(itemBatch);
    }
  }

  // ── Process single item ───────────────────────────────────

  private async processItem(
    job: ICatalogSyncJob,
    adapterItem: SyncAdapterItem,
  ): Promise<ImportItemResult> {
    try {
      const normalized = this.mapper.normalizeInbound(adapterItem, job.providerKey, job.marketplaceKey);

      // Duplicate detection: check existing external ref
      const existingRef = await this.repository.findExternalRef(
        job.workspaceId,
        job.accountId,
        ExternalRefType.PRODUCT,
        adapterItem.externalId,
      );

      // Conflict detection
      const conflictType = await this.conflictResolver.detect(normalized, existingRef, job);
      if (conflictType) {
        const resolution = this.conflictResolver.resolveStrategy(
          conflictType,
          job.conflictStrategy ?? null,
          normalized,
          existingRef,
        );

        // Persist conflict history
        await this.conflictResolver.persistConflict(job, normalized, conflictType, resolution, existingRef);

        if (resolution === 'SKIP') {
          return this.buildResult(adapterItem.externalId, adapterItem.itemType, SyncItemOperation.NOOP, SyncItemStatus.SKIPPED, null, 'SKIP', conflictType);
        }
        if (resolution === 'FLAG') {
          return this.buildResult(adapterItem.externalId, adapterItem.itemType, SyncItemOperation.NOOP, SyncItemStatus.CONFLICT, null, 'FLAG', conflictType);
        }
        // PROCEED — continue with upsert below
      }

      // Determine operation
      const operation = existingRef ? SyncItemOperation.UPDATE : SyncItemOperation.CREATE;
      const internalId = (existingRef?.['internalId'] as string | undefined) ?? null;

      // Upsert external ref
      const checksum = this.computeChecksum(normalized.raw);
      await this.repository.upsertExternalRef({
        workspaceId: job.workspaceId,
        accountId: job.accountId,
        providerKey: job.providerKey,
        marketplaceKey: job.marketplaceKey,
        refType: ExternalRefType.PRODUCT,
        externalId: adapterItem.externalId,
        externalSku: normalized.externalSku ?? null,
        externalTitle: normalized.title ?? null,
        internalId,
        internalSku: normalized.externalSku ?? null,
        internalType: normalized.itemType,
        status: ExternalRefStatus.ACTIVE,
        lastSyncedAt: new Date(),
        lastJobId: job.id,
        checksum,
      });

      return this.buildResult(adapterItem.externalId, adapterItem.itemType, operation, SyncItemStatus.SYNCED, internalId);
    } catch (err) {
      return {
        externalId: adapterItem.externalId,
        itemType: adapterItem.itemType,
        operation: SyncItemOperation.NOOP,
        status: SyncItemStatus.FAILED,
        errorCode: MP_CATALOG_SYNC_ERROR_CODES.ADAPTER_ERROR,
        errorMessage: this.sanitize((err as Error).message),
        retryable: true,
      };
    }
  }

  private buildResult(
    externalId: string,
    itemType: SyncItemType,
    operation: SyncItemOperation,
    status: SyncItemStatus,
    internalId?: string | null,
    conflictResolution?: string | null,
    conflictType?: SyncConflictType | null,
  ): ImportItemResult {
    return {
      externalId,
      internalId: internalId ?? null,
      itemType,
      operation,
      status,
      conflictType: conflictType ?? null,
      conflictResolution: conflictResolution ?? null,
      retryable: false,
    };
  }

  private computeChecksum(data: Record<string, unknown>): string {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex').substring(0, 16);
  }

  private safeSnapshot(data: Record<string, unknown>): Record<string, unknown> {
    const unsafe = /secret|token|password|credential|key|auth/i;
    return Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, unsafe.test(k) ? '***' : v]),
    );
  }

  private sanitize(msg: string): string {
    return msg
      .replace(/(secret|token|password|key|credential)=[^\s&]*/gi, '$1=***')
      .substring(0, 500);
  }
}
