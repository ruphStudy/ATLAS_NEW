import { Injectable, Logger } from '@nestjs/common';
import {
  IInventorySyncJob,
  InventoryItemType,
  InventorySyncAdapter,
  InventorySyncEvent,
  SyncDirection,
  SyncJobStatus,
  SyncScope,
} from '../interfaces';
import { InventorySyncRepository } from '../repository/inventory-sync.repository';
import { InventorySyncStateManager } from '../state/inventory-sync-state.manager';
import { InventorySyncEventQueue } from '../events/inventory-sync-events.queue';
import { InventoryPuller } from '../puller/inventory-puller';
import { InventoryPusher, AtlasInventoryPage } from '../pusher/inventory-pusher';
import { InventoryAdjustmentSyncer } from '../adjustment/inventory-adjustment.syncer';
import { InventoryReconciler } from '../reconciler/inventory-reconciler';
import { MP_INVENTORY_SYNC_ERROR_CODES } from '../constants';

export interface InventoryRunnerContext {
  job: IInventorySyncJob;
  adapter: InventorySyncAdapter;
  atlasFetcher?: (opts: {
    workspaceId: string;
    accountId: string;
    warehouseId?: string | null;
    itemType: InventoryItemType;
    cursor?: string | null;
    filterOptions?: Record<string, unknown> | null;
    pageSize: number;
  }) => Promise<AtlasInventoryPage>;
  sinceDelta?: Date | null;
}

@Injectable()
export class InventorySyncRunner {
  private readonly logger = new Logger(InventorySyncRunner.name);

  constructor(
    private readonly repository: InventorySyncRepository,
    private readonly stateManager: InventorySyncStateManager,
    private readonly eventQueue: InventorySyncEventQueue,
    private readonly puller: InventoryPuller,
    private readonly pusher: InventoryPusher,
    private readonly adjustmentSyncer: InventoryAdjustmentSyncer,
    private readonly reconciler: InventoryReconciler,
  ) {}

  async run(ctx: InventoryRunnerContext): Promise<void> {
    const { job } = ctx;

    try {
      if (job.scope === SyncScope.FULL || job.scope === SyncScope.INCREMENTAL || job.scope === SyncScope.DELTA || job.scope === SyncScope.RETRY) {
        // Adjustments (inbound) — always sync alongside main inventory
        if (job.direction === SyncDirection.INBOUND || job.direction === SyncDirection.BIDIRECTIONAL) {
          if (job.itemType === InventoryItemType.ADJUSTMENT || job.itemType === InventoryItemType.ALL) {
            await this.adjustmentSyncer.run(job, ctx.adapter, ctx.sinceDelta);
          }
          await this.puller.run(job, ctx.adapter);
        }

        if (job.direction === SyncDirection.OUTBOUND || job.direction === SyncDirection.BIDIRECTIONAL) {
          if (ctx.atlasFetcher) {
            await this.pusher.run(job, ctx.adapter, ctx.atlasFetcher);
          } else {
            this.logger.warn(`No atlasFetcher for outbound inventory sync job '${job.id}' — skipping`);
          }
        }

        // Reconciliation pass for FULL scope
        if (job.scope === SyncScope.FULL && job.itemType === InventoryItemType.RECONCILIATION || job.itemType === InventoryItemType.ALL) {
          await this.reconciler.run(job, ctx.adapter);
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

  private async finish(job: IInventorySyncJob, status: SyncJobStatus, errorMessage?: string): Promise<void> {
    const data: Record<string, unknown> = { status, completedAt: new Date() };
    if (errorMessage) {
      data['errorCode'] = MP_INVENTORY_SYNC_ERROR_CODES.ADAPTER_ERROR;
      data['errorMessage'] = errorMessage.replace(/(secret|token|password|key|credential)=[^\s&]*/gi, '$1=***').substring(0, 500);
    }
    await this.repository.updateJob(job.id, job.workspaceId, data);

    const fresh = await this.repository.findJobById(job.id, job.workspaceId);
    const eventName =
      status === SyncJobStatus.COMPLETED ? InventorySyncEvent.COMPLETED :
      status === SyncJobStatus.PARTIAL   ? InventorySyncEvent.PARTIAL :
      status === SyncJobStatus.CANCELLED ? InventorySyncEvent.CANCELLED :
                                           InventorySyncEvent.FAILED;

    await this.eventQueue.enqueue({
      event: eventName,
      jobId: job.id, correlationId: job.correlationId, workspaceId: job.workspaceId,
      accountId: job.accountId, providerKey: job.providerKey, marketplaceKey: job.marketplaceKey,
      warehouseId: job.warehouseId, direction: job.direction, scope: job.scope, itemType: job.itemType,
      status: (fresh?.['status'] as SyncJobStatus) ?? status,
      processedItems: (fresh?.['processedItems'] as number) ?? 0,
      totalItems: (fresh?.['totalItems'] as number) ?? 0,
      failedItems: (fresh?.['failedItems'] as number) ?? 0,
      timestamp: new Date(),
    });
  }
}
