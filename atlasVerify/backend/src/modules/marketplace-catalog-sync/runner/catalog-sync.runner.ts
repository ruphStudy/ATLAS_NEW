import { Injectable, Logger } from '@nestjs/common';
import {
  CatalogSyncEvent,
  CatalogSyncEventPayload,
  ICatalogSyncJob,
  SyncAdapterItem,
  SyncDirection,
  SyncItemType,
  SyncJobStatus,
} from '../interfaces';
import { CatalogSyncRepository } from '../repository/catalog-sync.repository';
import { CatalogSyncStateManager } from '../state/catalog-sync-state.manager';
import { CatalogSyncEventQueue } from '../events/catalog-sync-events.queue';
import { CatalogImporter } from '../importer/catalog-importer';
import { CatalogExporter, AtlasCatalogPage } from '../exporter/catalog-exporter';
import { MP_CATALOG_SYNC_ERROR_CODES } from '../constants';

export interface RunnerAdapter {
  fetchCatalogPage: (opts: {
    providerKey: string;
    accountId: string;
    itemType: SyncItemType;
    cursor?: string | null;
    filterOptions?: Record<string, unknown> | null;
    pageSize: number;
  }) => Promise<{ items: SyncAdapterItem[]; nextCursor?: string | null; totalCount?: number | null }>;
  pushCatalogItem?: (opts: {
    providerKey: string;
    accountId: string;
    item: Record<string, unknown>;
  }) => Promise<{ externalId: string; success: boolean; errorMessage?: string | null }>;
}

export interface RunnerContext {
  job: ICatalogSyncJob;
  adapter: RunnerAdapter;
  atlasFetcher?: (opts: {
    workspaceId: string;
    accountId: string;
    itemType: SyncItemType;
    cursor?: string | null;
    filterOptions?: Record<string, unknown> | null;
    pageSize: number;
  }) => Promise<AtlasCatalogPage>;
}

@Injectable()
export class CatalogSyncRunner {
  private readonly logger = new Logger(CatalogSyncRunner.name);

  constructor(
    private readonly repository: CatalogSyncRepository,
    private readonly stateManager: CatalogSyncStateManager,
    private readonly eventQueue: CatalogSyncEventQueue,
    private readonly importer: CatalogImporter,
    private readonly exporter: CatalogExporter,
  ) {}

  async run(ctx: RunnerContext): Promise<void> {
    const { job } = ctx;

    try {
      if (job.direction === SyncDirection.INBOUND || job.direction === SyncDirection.BIDIRECTIONAL) {
        await this.importer.run(job, ctx.adapter);
      }

      if (job.direction === SyncDirection.OUTBOUND || job.direction === SyncDirection.BIDIRECTIONAL) {
        if (ctx.atlasFetcher) {
          await this.exporter.run(job, ctx.adapter, ctx.atlasFetcher);
        } else {
          this.logger.warn(`No atlasFetcher for outbound sync job '${job.id}' — skipping outbound`);
        }
      }

      const fresh = await this.repository.findJobById(job.id, job.workspaceId);
      const failedItems = (fresh?.['failedItems'] as number) ?? 0;
      const processedItems = (fresh?.['processedItems'] as number) ?? 0;

      const finalStatus =
        failedItems === 0
          ? SyncJobStatus.COMPLETED
          : processedItems === failedItems
            ? SyncJobStatus.FAILED
            : SyncJobStatus.PARTIAL;

      await this.finishJob(job, finalStatus);
    } catch (err) {
      await this.finishJob(job, SyncJobStatus.FAILED, (err as Error).message);
    } finally {
      this.stateManager.unlock(job.workspaceId, job.accountId, job.direction);
      this.stateManager.clearCancelledMark(job.id);
    }
  }

  private async finishJob(
    job: ICatalogSyncJob,
    status: SyncJobStatus,
    errorMessage?: string,
  ): Promise<void> {
    const data: Record<string, unknown> = { status, completedAt: new Date() };
    if (errorMessage) {
      data['errorMessage'] = this.sanitize(errorMessage);
      data['errorCode'] = MP_CATALOG_SYNC_ERROR_CODES.ADAPTER_ERROR;
    }
    await this.repository.updateJob(job.id, job.workspaceId, data);

    const eventName =
      status === SyncJobStatus.COMPLETED
        ? CatalogSyncEvent.COMPLETED
        : status === SyncJobStatus.PARTIAL
          ? CatalogSyncEvent.PARTIAL
          : status === SyncJobStatus.CANCELLED
            ? CatalogSyncEvent.CANCELLED
            : CatalogSyncEvent.FAILED;

    const fresh = await this.repository.findJobById(job.id, job.workspaceId);
    await this.eventQueue.enqueue({
      event: eventName,
      jobId: job.id,
      correlationId: job.correlationId,
      workspaceId: job.workspaceId,
      accountId: job.accountId,
      providerKey: job.providerKey,
      marketplaceKey: job.marketplaceKey,
      direction: job.direction,
      scope: job.scope,
      itemType: job.itemType,
      status: (fresh?.['status'] as SyncJobStatus) ?? job.status,
      processedItems: (fresh?.['processedItems'] as number) ?? job.processedItems,
      totalItems: (fresh?.['totalItems'] as number) ?? job.totalItems,
      failedItems: (fresh?.['failedItems'] as number) ?? job.failedItems,
      timestamp: new Date(),
    });
  }

  private sanitize(msg: string): string {
    return msg.replace(/(secret|token|password|key|credential)=[^\s&]*/gi, '$1=***').substring(0, 500);
  }
}


@Injectable()
export class CatalogSyncRunner {
  private readonly logger = new Logger(CatalogSyncRunner.name);

  constructor(
    private readonly repository: CatalogSyncRepository,
    private readonly stateManager: CatalogSyncStateManager,
    private readonly eventQueue: CatalogSyncEventQueue,
    private readonly conflictResolver: CatalogSyncConflictResolver,
  ) {}

  async run(ctx: RunnerContext): Promise<void> {
    const { job } = ctx;

    try {
      if (job.direction === SyncDirection.INBOUND || job.direction === SyncDirection.BIDIRECTIONAL) {
        await this.runInbound(ctx);
      }
      if (job.direction === SyncDirection.OUTBOUND || job.direction === SyncDirection.BIDIRECTIONAL) {
        await this.runOutbound(ctx);
      }

      // Re-read counters to determine final status
      const fresh = await this.repository.findJobById(job.id, job.workspaceId);
      const failedItems = (fresh?.['failedItems'] as number) ?? 0;
      const processedItems = (fresh?.['processedItems'] as number) ?? 0;
      const finalStatus =
        failedItems === 0
          ? SyncJobStatus.COMPLETED
          : processedItems === 0
            ? SyncJobStatus.FAILED
            : SyncJobStatus.PARTIAL;

      await this.finishJob(job, finalStatus);
    } catch (err) {
      await this.finishJob(job, SyncJobStatus.FAILED, (err as Error).message);
    } finally {
      this.stateManager.unlock(job.workspaceId, job.accountId, job.direction);
      this.stateManager.clearCancelledMark(job.id);
    }
  }

  // ── Inbound (marketplace → ATLAS) ─────────────────────────

  private async runInbound(ctx: RunnerContext): Promise<void> {
    const { job, adapter } = ctx;
    let cursor: string | null | undefined = job.cursor ?? null;
    let page = 0;
    const itemResultBatch: Record<string, unknown>[] = [];

    while (page < MP_CATALOG_SYNC_CONSTANTS.MAX_PAGES_PER_JOB) {
      if (this.stateManager.isCancelled(job.id)) {
        await this.repository.updateJob(job.id, job.workspaceId, {
          status: SyncJobStatus.CANCELLED,
          cursor,
        });
        await this.eventQueue.enqueue(this.buildEventPayload(job, CatalogSyncEvent.CANCELLED));
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

      if (!pageResult.items || pageResult.items.length === 0) break;

      // Update totalItems on first page
      if (page === 0 && pageResult.totalCount != null) {
        await this.repository.updateJob(job.id, job.workspaceId, { totalItems: pageResult.totalCount });
      }

      // Persist cursor checkpoint
      if (pageResult.nextCursor) {
        await this.repository.updateJob(job.id, job.workspaceId, { cursor: pageResult.nextCursor });
      }

      const counters = { processedItems: 0, createdItems: 0, updatedItems: 0, failedItems: 0, conflictItems: 0, skippedItems: 0 };

      for (const adapterItem of pageResult.items) {
        const start = Date.now();
        const itemResult = await this.processInboundItem(job, adapterItem);
        const processingMs = Date.now() - start;

        itemResultBatch.push({ ...itemResult, jobId: job.id, workspaceId: job.workspaceId, processingMs });
        counters.processedItems++;

        if (itemResult['status'] === SyncItemStatus.SYNCED) {
          if (itemResult['operation'] === SyncItemOperation.CREATE) counters.createdItems++;
          else if (itemResult['operation'] === SyncItemOperation.UPDATE) counters.updatedItems++;
        } else if (itemResult['status'] === SyncItemStatus.FAILED) {
          counters.failedItems++;
        } else if (itemResult['status'] === SyncItemStatus.CONFLICT) {
          counters.conflictItems++;
        } else {
          counters.skippedItems++;
        }

        // Flush batch every 50 items
        if (itemResultBatch.length >= 50) {
          await this.repository.bulkCreateItemResults([...itemResultBatch]);
          itemResultBatch.length = 0;
        }
      }

      await this.repository.incrementJobCounters(job.id, counters);

      // Emit progress every PROGRESS_EMIT_EVERY processed
      const fresh = await this.repository.findJobById(job.id, job.workspaceId);
      const processed = (fresh?.['processedItems'] as number) ?? 0;
      if (processed % MP_CATALOG_SYNC_CONSTANTS.PROGRESS_EMIT_EVERY === 0) {
        await this.eventQueue.enqueue(this.buildEventPayload(job, CatalogSyncEvent.PROGRESS, fresh));
      }

      cursor = pageResult.nextCursor ?? null;
      if (!cursor) break;
      page++;
    }

    // Flush remaining
    if (itemResultBatch.length > 0) {
      await this.repository.bulkCreateItemResults(itemResultBatch);
    }
  }

  private async processInboundItem(
    job: ICatalogSyncJob,
    adapterItem: SyncAdapterItem,
  ): Promise<Record<string, unknown>> {
    try {
      // Conflict detection: check if item already exists
      const conflictType = this.conflictResolver.detectConflict(adapterItem);
      if (conflictType) {
        const resolution = this.conflictResolver.resolve(
          conflictType,
          job.conflictStrategy ?? null,
          adapterItem,
        );
        if (resolution === 'SKIP') {
          return {
            externalId: adapterItem.externalId,
            itemType: adapterItem.itemType,
            operation: SyncItemOperation.NOOP,
            status: SyncItemStatus.SKIPPED,
            conflictType,
            conflictResolution: 'SKIP',
          };
        }
        if (resolution === 'FLAG') {
          return {
            externalId: adapterItem.externalId,
            itemType: adapterItem.itemType,
            operation: SyncItemOperation.NOOP,
            status: SyncItemStatus.CONFLICT,
            conflictType,
            conflictResolution: 'FLAG',
          };
        }
      }

      // Determine operation (simplified: real impl would look up internal catalog)
      const operation = adapterItem.data['_atlasInternalId'] ? SyncItemOperation.UPDATE : SyncItemOperation.CREATE;

      return {
        externalId: adapterItem.externalId,
        internalId: (adapterItem.data['_atlasInternalId'] as string | undefined) ?? null,
        itemType: adapterItem.itemType,
        operation,
        status: SyncItemStatus.SYNCED,
        retryable: false,
        snapshot: this.sanitizeSnapshot(adapterItem.data),
      };
    } catch (err) {
      return {
        externalId: adapterItem.externalId,
        itemType: adapterItem.itemType,
        operation: SyncItemOperation.NOOP,
        status: SyncItemStatus.FAILED,
        errorCode: MP_CATALOG_SYNC_ERROR_CODES.ADAPTER_ERROR,
        errorMessage: this.sanitizeError((err as Error).message),
        retryable: true,
      };
    }
  }

  // ── Outbound (ATLAS → marketplace) ────────────────────────

  private async runOutbound(ctx: RunnerContext): Promise<void> {
    if (!ctx.adapter.pushCatalogItem) {
      this.logger.warn(`Adapter for ${ctx.job.providerKey} does not support pushCatalogItem — skipping outbound`);
      return;
    }
    // Outbound sync would fetch from internal ATLAS catalog and push.
    // Placeholder for provider-specific implementation.
  }

  // ── Finish ────────────────────────────────────────────────

  private async finishJob(job: ICatalogSyncJob, status: SyncJobStatus, errorMessage?: string): Promise<void> {
    const data: Record<string, unknown> = { status, completedAt: new Date() };
    if (errorMessage) {
      data['errorMessage'] = this.sanitizeError(errorMessage);
      data['errorCode'] = MP_CATALOG_SYNC_ERROR_CODES.ADAPTER_ERROR;
    }

    await this.repository.updateJob(job.id, job.workspaceId, data);

    const eventName =
      status === SyncJobStatus.COMPLETED
        ? CatalogSyncEvent.COMPLETED
        : status === SyncJobStatus.PARTIAL
          ? CatalogSyncEvent.PARTIAL
          : status === SyncJobStatus.CANCELLED
            ? CatalogSyncEvent.CANCELLED
            : CatalogSyncEvent.FAILED;

    const fresh = await this.repository.findJobById(job.id, job.workspaceId);
    await this.eventQueue.enqueue(this.buildEventPayload(job, eventName, fresh));
  }

  // ── Helpers ───────────────────────────────────────────────

  private buildEventPayload(
    job: ICatalogSyncJob,
    event: CatalogSyncEvent,
    fresh?: Record<string, unknown> | null,
  ): CatalogSyncEventPayload {
    return {
      event,
      jobId: job.id,
      correlationId: job.correlationId,
      workspaceId: job.workspaceId,
      accountId: job.accountId,
      providerKey: job.providerKey,
      marketplaceKey: job.marketplaceKey,
      direction: job.direction,
      scope: job.scope,
      itemType: job.itemType,
      status: (fresh?.['status'] as SyncJobStatus) ?? job.status,
      processedItems: (fresh?.['processedItems'] as number) ?? job.processedItems,
      totalItems: (fresh?.['totalItems'] as number) ?? job.totalItems,
      failedItems: (fresh?.['failedItems'] as number) ?? job.failedItems,
      timestamp: new Date(),
    };
  }

  private sanitizeSnapshot(data: Record<string, unknown>): Record<string, unknown> {
    const unsafe = /secret|token|password|credential|key|auth/i;
    return Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, unsafe.test(k) ? '***' : v]),
    );
  }

  private sanitizeError(msg: string): string {
    return msg.replace(/(secret|token|password|key|credential)=[^\s&]*/gi, '$1=***').substring(0, 500);
  }
}
