import { Injectable, Logger } from '@nestjs/common';
import {
  AdjustmentAdapterItem,
  AdjustmentStatus,
  IInventorySyncJob,
  InventoryAdjustmentType,
  InventorySyncAdapter,
  InventorySyncEvent,
  SyncJobStatus,
} from '../interfaces';
import { InventorySyncRepository } from '../repository/inventory-sync.repository';
import { InventorySyncStateManager } from '../state/inventory-sync-state.manager';
import { InventorySyncEventQueue } from '../events/inventory-sync-events.queue';
import { InventoryMapper } from '../mapper/inventory-mapper';
import { MP_INVENTORY_SYNC_CONSTANTS, MP_INVENTORY_SYNC_ERROR_CODES } from '../constants';

@Injectable()
export class InventoryAdjustmentSyncer {
  private readonly logger = new Logger(InventoryAdjustmentSyncer.name);

  constructor(
    private readonly repository: InventorySyncRepository,
    private readonly stateManager: InventorySyncStateManager,
    private readonly eventQueue: InventorySyncEventQueue,
    private readonly mapper: InventoryMapper,
  ) {}

  /**
   * Pages through marketplace adjustments and persists them as ATLAS
   * InventoryAdjustment records.
   */
  async run(job: IInventorySyncJob, adapter: InventorySyncAdapter, since?: Date | null): Promise<void> {
    if (!adapter.fetchAdjustments) {
      this.logger.debug(`Adapter '${job.providerKey}' does not support fetchAdjustments — skipping`);
      return;
    }

    let cursor: string | null | undefined = null;
    let page = 0;
    let batch: Record<string, unknown>[] = [];

    while (page < MP_INVENTORY_SYNC_CONSTANTS.MAX_PAGES_PER_JOB) {
      if (this.stateManager.isCancelled(job.id)) break;

      const result = await adapter.fetchAdjustments({
        providerKey: job.providerKey,
        accountId: job.accountId,
        warehouseId: job.warehouseId,
        since: since ?? null,
        cursor,
        pageSize: MP_INVENTORY_SYNC_CONSTANTS.ITEMS_PER_PAGE,
      });

      if (!result.items?.length) break;

      for (const raw of result.items) {
        const normalized = this.mapper.normalizeAdjustment(raw);
        batch.push({
          workspaceId: job.workspaceId,
          accountId: job.accountId,
          providerKey: job.providerKey,
          marketplaceKey: job.marketplaceKey,
          warehouseId: normalized.warehouseId ?? job.warehouseId ?? null,
          jobId: job.id,
          externalId: normalized.externalId,
          sku: normalized.sku,
          adjustmentType: normalized.adjustmentType,
          quantity: normalized.quantity,
          reason: normalized.reason,
          notes: normalized.notes,
          appliedAt: normalized.appliedAt ?? new Date(),
          status: AdjustmentStatus.APPLIED,
        });

        if (batch.length >= MP_INVENTORY_SYNC_CONSTANTS.ITEM_RESULT_FLUSH_SIZE) {
          await this.repository.bulkCreateAdjustments([...batch]);
          await this.repository.incrementJobCounters(job.id, { adjustedItems: batch.length });
          batch = [];
        }
      }

      cursor = result.nextCursor ?? null;
      if (!cursor) break;
      page++;
    }

    if (batch.length > 0) {
      await this.repository.bulkCreateAdjustments(batch);
      await this.repository.incrementJobCounters(job.id, { adjustedItems: batch.length });
    }

    await this.eventQueue.enqueue({
      event: InventorySyncEvent.ADJUSTMENT_APPLIED,
      jobId: job.id, correlationId: job.correlationId, workspaceId: job.workspaceId,
      accountId: job.accountId, providerKey: job.providerKey, marketplaceKey: job.marketplaceKey,
      warehouseId: job.warehouseId, direction: job.direction, scope: job.scope, itemType: job.itemType,
      timestamp: new Date(),
    });
  }
}
