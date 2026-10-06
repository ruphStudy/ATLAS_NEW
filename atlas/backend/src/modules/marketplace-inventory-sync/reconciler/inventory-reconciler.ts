import { Injectable, Logger } from '@nestjs/common';
import {
  IInventorySyncJob,
  InventoryConflictType,
  InventorySyncAdapter,
  InventorySyncEvent,
  SyncItemOperation,
  SyncItemStatus,
} from '../interfaces';
import { InventorySyncRepository } from '../repository/inventory-sync.repository';
import { InventoryMapper } from '../mapper/inventory-mapper';
import { InventorySyncEventQueue } from '../events/inventory-sync-events.queue';
import { MP_INVENTORY_SYNC_CONSTANTS } from '../constants';

/**
 * Reconciles ATLAS inventory against marketplace inventory.
 * Compares stored external refs with fresh marketplace data and flags
 * or resolves discrepancies.
 */
@Injectable()
export class InventoryReconciler {
  private readonly logger = new Logger(InventoryReconciler.name);

  constructor(
    private readonly repository: InventorySyncRepository,
    private readonly mapper: InventoryMapper,
    private readonly eventQueue: InventorySyncEventQueue,
  ) {}

  async run(job: IInventorySyncJob, adapter: InventorySyncAdapter): Promise<void> {
    await this.eventQueue.enqueue({
      event: InventorySyncEvent.RECONCILIATION_STARTED,
      jobId: job.id, correlationId: job.correlationId, workspaceId: job.workspaceId,
      accountId: job.accountId, providerKey: job.providerKey, marketplaceKey: job.marketplaceKey,
      warehouseId: job.warehouseId, direction: job.direction, scope: job.scope, itemType: job.itemType,
      timestamp: new Date(),
    });

    let page = 1;
    let reconciledCount = 0;

    while (true) {
      const [refs, total] = await this.repository.findExternalRefs(job.workspaceId, job.accountId, {
        warehouseId: job.warehouseId,
        page,
        limit: MP_INVENTORY_SYNC_CONSTANTS.ITEMS_PER_PAGE,
      });

      if (!refs.length) break;

      for (const ref of refs) {
        try {
          const marketplacePage = await adapter.fetchInventoryPage({
            providerKey: job.providerKey,
            accountId: job.accountId,
            warehouseId: job.warehouseId,
            itemType: job.itemType,
            cursor: null,
            filterOptions: { externalIds: [ref['externalId']] } as Record<string, unknown>,
            pageSize: 1,
          });

          if (!marketplacePage.items?.length) continue;

          const fresh = this.mapper.normalizeInbound(marketplacePage.items[0], job.providerKey, job.marketplaceKey);
          const storedAvail = Number(ref['available'] ?? 0);

          if (storedAvail !== fresh.available) {
            await this.repository.createConflict({
              jobId: job.id,
              workspaceId: job.workspaceId,
              accountId: job.accountId,
              providerKey: job.providerKey,
              marketplaceKey: job.marketplaceKey,
              warehouseId: job.warehouseId ?? null,
              externalId: ref['externalId'] as string,
              internalId: ref['internalId'] as string | null,
              conflictType: InventoryConflictType.QUANTITY_MISMATCH,
              strategy: job.conflictStrategy ?? 'MARKETPLACE_WINS',
              resolution: 'PENDING_RECONCILIATION',
              atlasSnapshot: { available: storedAvail, reserved: ref['reserved'], incoming: ref['incoming'] },
              marketplaceSnapshot: { available: fresh.available, reserved: fresh.reserved, incoming: fresh.incoming },
            });
          }

          reconciledCount++;
        } catch (err) {
          this.logger.warn(`Reconciliation failed for ref '${ref['externalId']}': ${(err as Error).message}`);
        }
      }

      await this.repository.incrementJobCounters(job.id, { reconciledItems: reconciledCount });
      if (refs.length < MP_INVENTORY_SYNC_CONSTANTS.ITEMS_PER_PAGE) break;
      page++;
    }

    await this.eventQueue.enqueue({
      event: InventorySyncEvent.RECONCILIATION_COMPLETED,
      jobId: job.id, correlationId: job.correlationId, workspaceId: job.workspaceId,
      accountId: job.accountId, providerKey: job.providerKey, marketplaceKey: job.marketplaceKey,
      warehouseId: job.warehouseId, direction: job.direction, scope: job.scope, itemType: job.itemType,
      timestamp: new Date(),
    });
  }
}
