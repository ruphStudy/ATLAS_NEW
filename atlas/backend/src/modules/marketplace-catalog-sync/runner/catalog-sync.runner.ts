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
