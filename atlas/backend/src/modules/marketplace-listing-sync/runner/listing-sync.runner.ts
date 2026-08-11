import { Injectable, Logger } from '@nestjs/common';
import {
  IListingSyncJob,
  ListingItemType,
  ListingSyncAdapter,
  ListingSyncEvent,
  SyncDirection,
  SyncJobStatus,
} from '../interfaces';
import { ListingSyncRepository } from '../repository/listing-sync.repository';
import { ListingSyncStateManager } from '../state/listing-sync-state.manager';
import { ListingSyncEventQueue } from '../events/listing-sync-events.queue';
import { ListingPuller } from '../puller/listing-puller';
import { ListingPusher, AtlasListingPage } from '../pusher/listing-pusher';
import { MP_LISTING_SYNC_ERROR_CODES } from '../constants';

export interface ListingRunnerContext {
  job: IListingSyncJob;
  adapter: ListingSyncAdapter;
  atlasFetcher?: (opts: {
    workspaceId: string;
    accountId: string;
    itemType: ListingItemType;
    cursor?: string | null;
    filterOptions?: Record<string, unknown> | null;
    pageSize: number;
  }) => Promise<AtlasListingPage>;
}

@Injectable()
export class ListingSyncRunner {
  private readonly logger = new Logger(ListingSyncRunner.name);

  constructor(
    private readonly repository: ListingSyncRepository,
    private readonly stateManager: ListingSyncStateManager,
    private readonly eventQueue: ListingSyncEventQueue,
    private readonly puller: ListingPuller,
    private readonly pusher: ListingPusher,
  ) {}

  async run(ctx: ListingRunnerContext): Promise<void> {
    const { job } = ctx;

    try {
      if (job.direction === SyncDirection.INBOUND || job.direction === SyncDirection.BIDIRECTIONAL) {
        await this.puller.run(job, ctx.adapter);
      }

      if (job.direction === SyncDirection.OUTBOUND || job.direction === SyncDirection.BIDIRECTIONAL) {
        if (ctx.atlasFetcher) {
          await this.pusher.run(job, ctx.adapter, ctx.atlasFetcher);
        } else {
          this.logger.warn(`No atlasFetcher for outbound listing sync job '${job.id}' — skipping`);
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

      await this.finish(job, finalStatus);
    } catch (err) {
      await this.finish(job, SyncJobStatus.FAILED, (err as Error).message);
    } finally {
      this.stateManager.unlock(job.workspaceId, job.accountId, job.direction);
      this.stateManager.clearCancelledMark(job.id);
    }
  }

  private async finish(job: IListingSyncJob, status: SyncJobStatus, errorMessage?: string): Promise<void> {
    const data: Record<string, unknown> = { status, completedAt: new Date() };
    if (errorMessage) {
      data['errorCode'] = MP_LISTING_SYNC_ERROR_CODES.ADAPTER_ERROR;
      data['errorMessage'] = errorMessage.replace(/(secret|token|password|key|credential)=[^\s&]*/gi, '$1=***').substring(0, 500);
    }
    await this.repository.updateJob(job.id, job.workspaceId, data);

    const fresh = await this.repository.findJobById(job.id, job.workspaceId);
    const eventName =
      status === SyncJobStatus.COMPLETED ? ListingSyncEvent.COMPLETED :
      status === SyncJobStatus.PARTIAL   ? ListingSyncEvent.PARTIAL :
      status === SyncJobStatus.CANCELLED ? ListingSyncEvent.CANCELLED :
                                           ListingSyncEvent.FAILED;

    await this.eventQueue.enqueue({
      event: eventName,
      jobId: job.id, correlationId: job.correlationId, workspaceId: job.workspaceId,
      accountId: job.accountId, providerKey: job.providerKey, marketplaceKey: job.marketplaceKey,
      direction: job.direction, scope: job.scope, itemType: job.itemType,
      status: (fresh?.['status'] as SyncJobStatus) ?? status,
      processedItems: (fresh?.['processedItems'] as number) ?? 0,
      totalItems: (fresh?.['totalItems'] as number) ?? 0,
      failedItems: (fresh?.['failedItems'] as number) ?? 0,
      timestamp: new Date(),
    });
  }
}
